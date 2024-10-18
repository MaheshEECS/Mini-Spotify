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
const PORT = process.env.PORT || 3000;

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
    console.log('Authorization Code:', code);

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
            console.log('Error Response Body:', errorBody);
            throw new Error(`Failed to obtain access token: ${errorBody}`);
        }

        const data = await response.json();
        console.log('Response Data:', data);

        if (!data.access_token) {
            throw new Error('Access token is missing from the response.');
        }

        // Set the access token as an HTTP-only cookie
        res.cookie('access_token', data.access_token, { 
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Use secure in production
            maxAge: 3600000, // 1 hour
            sameSite: 'lax'
        });

        // Redirect to home
        res.redirect('/');
    } catch (error) {
        console.error('Error during callback:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Check authentication status
app.get('/check-auth', (req, res) => {
    const accessToken = req.cookies.access_token;
    res.json({ isLoggedIn: !!accessToken });
});

// Search route
app.get('/search', async (req, res) => {
    const query = req.query.q;
    const accessToken = req.cookies.access_token;

    console.log('All Cookies:', req.cookies);
    console.log('Access Token:', accessToken);
    console.log('Search Query:', query);

    if (!accessToken) {
        console.error('Access token is missing in the search request.');
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
        console.error('Error during search:', error);
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