const searchButton = document.getElementById('search-button');
const searchInput = document.getElementById('search-query'); // Fixed ID to match the input field
const resultsElement = document.getElementById('results');

let currentAudio = null; // Store the currently playing audio element
let currentButton = null; // Store the current play/pause button

searchButton.addEventListener('click', async () => {
    const query = searchInput.value;
    console.log('Search query:', query); // Log search query to make sure it's captured

    if (query) {
        try {
            const response = await fetch(`/search?q=${encodeURIComponent(query)}`);
            const tracks = await response.json();
            console.log('Fetched tracks:', tracks); // Log fetched tracks to inspect the response
            renderResults(tracks);
        } catch (error) {
            console.error('Error fetching search results:', error);
            resultsElement.innerHTML = `<p>Error fetching results. Please try again.</p>`;
        }
    } else {
        resultsElement.innerHTML = `<p>Please enter a search term.</p>`;
    }
});

function renderResults(tracks) {
    resultsElement.innerHTML = ''; // Clear previous results
    console.log('Rendering results for tracks:', tracks);

    if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
        resultsElement.innerHTML = `<p>No tracks found. Please try another search term.</p>`;
        return;
    }

    tracks.forEach(track => {
        const trackElement = document.createElement('div');
        trackElement.className = 'track';
        trackElement.innerHTML = `
            <div class="track-container">
                <img src="${track.album.images.length > 0 ? track.album.images[0].url : 'default-image-url.jpg'}" alt="${track.name} Album Cover" class="album-cover" />
                <button class="play-pause-btn" data-preview-url="${track.preview_url}">▶️</button>
            </div>
            <div>
                <strong>${track.name}</strong> by ${track.artists.map(artist => artist.name).join(', ')}
            </div>
        `;
        resultsElement.appendChild(trackElement);

        const playPauseButton = trackElement.querySelector('.play-pause-btn');
        playPauseButton.addEventListener('click', () => {
            handlePlayButtonClick(playPauseButton, track.preview_url);
        });
    });
}

function handlePlayButtonClick(button, previewUrl) {
    console.log('Clicked play for preview URL:', previewUrl);

    if (!previewUrl) {
        alert('No preview available for this track.');
        return;
    }

    if (currentAudio) {
        currentAudio.pause();
        if (currentButton) {
            currentButton.textContent = '▶️'; // Change back to play icon
        }
    }

    if (currentAudio && currentAudio.src === previewUrl) {
        currentAudio = null;
        currentButton = null;
        button.textContent = '▶️'; // Change to play icon
    } else {
        const audio = new Audio(previewUrl);
        audio.play();
        currentAudio = audio; // Store the currently playing audio
        currentButton = button; // Store the current play button
        button.textContent = '⏸️'; // Change to pause icon

        audio.addEventListener('ended', () => {
            button.textContent = '▶️'; // Change back to play icon
            currentAudio = null;
            currentButton = null;
        });
    }
}
