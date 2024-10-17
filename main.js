import express from 'express';
import cookieParser from 'cookie-parser';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000; // Allow PORT to be configurable via environment variable

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.static('public'));

// Spotify Credentials
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

// Authorization URL
const AUTH_URL = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=user-read-private user-read-email`;

// Route to start the login process
app.get('/login', (req, res) => {
    res.redirect(AUTH_URL);
});

// Callback route
app.get('/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) {
        return res.status(400).json({ error: 'Authorization code is missing' });
    }

    try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: REDIRECT_URI
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Failed to obtain access token: ${errorBody}`);
        }

        const data = await response.json();
        res.cookie('access_token', data.access_token, { 
            httpOnly: false,
            maxAge: 3600000, // 1 hour
            path: '/',
            sameSite: 'strict'
        });

        res.send(`
            <script>
            document.cookie = "access_token_set=true;path=/;max-age=3600;";
            window.location.href = '/';
            </script>
        `);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Search route
app.get('/search', async (req, res) => {
    const query = req.query.q;
    const accessToken = req.cookies.access_token;

    if (!accessToken) {
        return res.status(401).json({ error: 'Access token is missing. Please log in again.' });
    }

    try {
        const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Error fetching data from Spotify: ${errorBody}`);
        }

        const data = await response.json();
        if (data.tracks.items.length > 0) {
            res.json(data.tracks.items);
        } else {
            res.json({ message: 'No results found.' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Home route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
