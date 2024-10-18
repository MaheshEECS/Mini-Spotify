const searchButton = document.getElementById('search-button');
const searchInput = document.getElementById('search-query');
const resultsElement = document.getElementById('results');
const loginButton = document.getElementById('login-button');
const searchContainer = document.getElementById('search-container');
const videoContainer = document.getElementById('video-container');
const videoPlayer = document.getElementById('video-player');

let currentAudio = null;
let currentButton = null;

searchButton.addEventListener('click', performSearch);
searchInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        performSearch();
    }
});

loginButton.addEventListener('click', () => {
    window.location.href = '/login';
});

// Check login status on page load
document.addEventListener('DOMContentLoaded', checkLoginStatus);

function checkLoginStatus() {
    fetch('/check-auth')
        .then(response => response.json())
        .then(data => {
            if (data.isLoggedIn) {
                loginButton.style.display = 'none';
                searchContainer.style.display = 'block';
            } else {
                loginButton.style.display = 'block';
                searchContainer.style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Error checking auth status:', error);
            showErrorMessage('Error checking authentication status. Please try again.');
        });
}

async function performSearch() {
    const query = searchInput.value.trim();
    console.log('Search query:', query);

    if (query) {
        try {
            showLoadingIndicator();
            const [spotifyResponse, youtubeResponse] = await Promise.all([
                fetch(`/search?q=${encodeURIComponent(query)}`),
                fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&key=AIzaSyAmb-ZGctON-uj0r0od4yKv6hZ6agpxir8`)
            ]);

            if (!spotifyResponse.ok) {
                if (spotifyResponse.status === 401) {
                    showErrorMessage('Session expired. Please log in again.');
                    checkLoginStatus(); // Update UI to show login button
                    return;
                }
                throw new Error(`HTTP error! status: ${spotifyResponse.status}`);
            }

            const tracks = await spotifyResponse.json();
            console.log('Fetched tracks:', tracks);
            renderResults(tracks);

            const youtubeData = await youtubeResponse.json();
            console.log('Fetched YouTube videos:', youtubeData);
            renderYouTubeResults(youtubeData.items);
        } catch (error) {
            console.error('Error fetching search results:', error);
            showErrorMessage('Error fetching results. Please try again.');
        } finally {
            hideLoadingIndicator();
        }
    } else {
        showErrorMessage('Please enter a search term.');
    }
}

function renderResults(tracks) {
    resultsElement.innerHTML = '';
    console.log('Rendering results for tracks:', tracks);

    if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
        showErrorMessage('No tracks found. Please try another search term.');
        return;
    }

    const trackList = document.createElement('ul');
    trackList.className = 'track-list';
    trackList.setAttribute('aria-label', 'Search Results');

    tracks.forEach(track => {
        const trackElement = document.createElement('li');
        trackElement.className = 'track';
        trackElement.innerHTML = `
            <div class="track-container">
                <img src="${track.album.images.length > 0 ? track.album.images[0].url : 'default-image-url.jpg'}" 
                     alt="${track.name} Album Cover" class="album-cover" />
                <button class="play-pause-btn" data-preview-url="${track.preview_url}" aria-label="Play ${track.name}">▶️</button>
            </div>
            <div class="track-info">
                <strong>${track.name}</strong> by ${track.artists.map(artist => artist.name).join(', ')}
            </div>
        `;
        trackList.appendChild(trackElement);

        const playPauseButton = trackElement.querySelector('.play-pause-btn');
        playPauseButton.addEventListener('click', () => {
            handlePlayButtonClick(playPauseButton, track.preview_url, track.name);
        });
    });

    resultsElement.appendChild(trackList);
}

function renderYouTubeResults(videos) {
    const videoList = document.createElement('ul');
    videoList.className = 'video-list';
    videoList.setAttribute('aria-label', 'YouTube Search Results');

    videos.forEach(video => {
        const videoElement = document.createElement('li');
        videoElement.className = 'video';
        videoElement.innerHTML = `
            <div class="video-container">
                <strong>${video.snippet.title}</strong>
                <button class="play-video-btn" data-video-id="${video.id.videoId}" aria-label="Play ${video.snippet.title}">▶️</button>
            </div>
        `;
        videoList.appendChild(videoElement);

        const playVideoButton = videoElement.querySelector('.play-video-btn');
        playVideoButton.addEventListener('click', () => {
            playYouTubeVideo(video.id.videoId);
        });
    });

    resultsElement.appendChild(videoList);
}

function playYouTubeVideo(videoId) {
    videoPlayer.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    videoContainer.style.display = 'block';
}

function handlePlayButtonClick(button, previewUrl, trackName) {
    console.log('Clicked play for preview URL:', previewUrl);

    if (!previewUrl) {
        alert('No preview available for this track.');
        return;
    }

    if (currentAudio) {
        currentAudio.pause();
        if (currentButton) {
            currentButton.textContent = '▶️';
            currentButton.setAttribute('aria-label', `Play ${trackName}`);
        }
    }

    if (currentAudio && currentAudio.src === previewUrl) {
        currentAudio = null;
        currentButton = null;
        button.textContent = '▶️';
        button.setAttribute('aria-label', `Play ${trackName}`);
    } else {
        const audio = new Audio(previewUrl);
        audio.play();
        currentAudio = audio;
        currentButton = button;
        button.textContent = '⏸️';
        button.setAttribute('aria-label', `Pause ${trackName}`);

        audio.addEventListener('ended', () => {
            button.textContent = '▶️';
            button.setAttribute('aria-label', `Play ${trackName}`);
            currentAudio = null;
            currentButton = null;
        });
    }
}

function showLoadingIndicator() {
    const loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'loading-indicator';
    loadingIndicator.textContent = 'Loading...';
    resultsElement.appendChild(loadingIndicator);
}

function hideLoadingIndicator() {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.remove();
    }
}

function showErrorMessage(message) {
    resultsElement.innerHTML = `<p class="error-message">${message}</p>`;
}
