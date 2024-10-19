// ... (previous code remains the same)

const scrollToTopButton = document.getElementById('scroll-to-top');

// ... (other event listeners)

scrollToTopButton.addEventListener('click', scrollToTop);

// ... (previous functions remain the same)

// Scroll to top function
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Show/hide scroll-to-top button based on scroll position
window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
        scrollToTopButton.style.display = 'flex';
    } else {
        scrollToTopButton.style.display = 'none';
    }
});

const searchButton = document.getElementById('search-button');
const youtubeSearchButton = document.getElementById('youtube-search-button');
const searchInput = document.getElementById('search-query');
const youtubeInput = document.getElementById('youtube-query');
const spotifyResults = document.getElementById('spotify-results');
const youtubeResults = document.getElementById('youtube-results');
const loginButton = document.getElementById('login-button');
const searchContainer = document.getElementById('search-container');
const videoContainer = document.getElementById('video-container');
const videoPlayer = document.getElementById('video-player');
const searchHistory = document.getElementById('search-history');
const clearAllHistoryButton = document.getElementById('clear-all-history');

const YOUTUBE_API_KEY = 'AIzaSyAmb-ZGctON-uj0r0od4yKv6hZ6agpxir8';

let currentAudio = null;
let currentButton = null;

// Event Listeners
searchButton.addEventListener('click', () => performSearch('spotify'));
youtubeSearchButton.addEventListener('click', () => performSearch('youtube'));
searchInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        performSearch('spotify');
    }
});
youtubeInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        performSearch('youtube');
    }
});
loginButton.addEventListener('click', () => {
    window.location.href = '/login';
});
clearAllHistoryButton.addEventListener('click', clearSearchHistory);

document.addEventListener('DOMContentLoaded', () => {
    checkLoginStatus();
    loadSearchHistory();
});

// Check login status
function checkLoginStatus() {
    fetch('/check-auth')
        .then(response => response.json())
        .then(data => {
            console.log('Auth status:', data);
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

// Perform search based on type
async function performSearch(type) {
    const query = type === 'spotify' ? searchInput.value.trim() : youtubeInput.value.trim();
    console.log(`${type.charAt(0).toUpperCase() + type.slice(1)} search query:`, query);

    if (query) {
        try {
            showLoadingIndicator(type);
            let results;

            if (type === 'spotify') {
                results = await fetchSpotifyResults(query);
                renderSpotifyResults(results);
                spotifyResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                results = await fetchYouTubeResults(query);
                renderYouTubeResults(results.items);
                youtubeResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            addToSearchHistory(type, query);
        } catch (error) {
            console.error(`Error fetching ${type} search results:`, error);
            showErrorMessage(`Error fetching ${type} results. Please try again.`);
        } finally {
            hideLoadingIndicator(type);
        }
    } else {
        showErrorMessage('Please enter a search term.');
    }
}

// Fetch Spotify results
async function fetchSpotifyResults(query) {
    const response = await fetch(`/search?q=${encodeURIComponent(query)}`);
    console.log('Spotify search response:', response);
    if (!response.ok) {
        if (response.status === 401) {
            showErrorMessage('Session expired. Please log in again.');
            checkLoginStatus();
            return [];
        }
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
}

// Fetch YouTube results
async function fetchYouTubeResults(query) {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}`);
    console.log('YouTube search response:', response);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
}

// Render Spotify results
function renderSpotifyResults(tracks) {
    spotifyResults.innerHTML = '<h2>Spotify Results</h2>';
    console.log('Rendering results for tracks:', tracks);

    if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
        showErrorMessage('No tracks found. Please try another search term.');
        return;
    }

    const trackList = document.createElement('ul');
    trackList.className = 'track-list';
    trackList.setAttribute('aria-label', 'Spotify Search Results');

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

    spotifyResults.appendChild(trackList);
}

// Render YouTube results
function renderYouTubeResults(videos) {
    youtubeResults.innerHTML = '<h2>YouTube Results</h2>';
    const videoList = document.createElement('ul');
    videoList.className = 'video-list';
    videoList.setAttribute('aria-label', 'YouTube Search Results');

    if (!videos || videos.length === 0) {
        showErrorMessage('No YouTube videos found. Please try another search term.');
        return;
    }

    videos.forEach(video => {
        const videoElement = document.createElement('li');
        videoElement.className = 'video';
        videoElement.innerHTML = `
            <div class="video-container">
                <img src="${video.snippet.thumbnails.default.url}" 
                     alt="${video.snippet.title} Thumbnail" class="video-thumbnail" />
                <button class="play-video-btn" data-video-id="${video.id.videoId}" aria-label="Play ${video.snippet.title}">▶️</button>
            </div>
            <div class="video-info">
                <strong>${video.snippet.title}</strong>
                <p>${video.snippet.channelTitle}</p>
            </div>
        `;
        videoList.appendChild(videoElement);

        const playVideoButton = videoElement.querySelector('.play-video-btn');
        playVideoButton.addEventListener('click', () => {
            playYouTubeVideo(video.id.videoId);
        });
    });

    youtubeResults.appendChild(videoList);
}

// Play YouTube video
function playYouTubeVideo(videoId) {
    console.log('Playing YouTube video:', videoId);
    videoPlayer.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    videoContainer.style.display = 'block';
    videoContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Handle play button click
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
        audio.onerror = (error) => {
            console.error('Error playing audio:', error);
            alert('Error playing audio. Please try again.');
        };
        audio.onplay = () => console.log('Audio started playing');
        audio.onpause = () => console.log('Audio paused');
        audio.onended = () => console.log('Audio playback ended');

        audio.play().catch(error => {
            console.error('Playback error:', error);
            alert('Playback error. Please try again.');
        });

        currentAudio = audio;
        currentButton = button;
        button.textContent = '⏸️';
        button.setAttribute('aria-label', `Pause ${trackName}`);

        audio.addEventListener('ended', () => {
            currentAudio = null;
            currentButton = null;
            button.textContent = '▶️';
            button.setAttribute('aria-label', `Play ${trackName}`);
        });
    }
}

// Show loading indicator
function showLoadingIndicator(type) {
    const loadingMessage = document.createElement('p');
    loadingMessage.className = 'loading';
    loadingMessage.textContent = `Loading ${type} results...`;
    if (type === 'spotify') {
        spotifyResults.innerHTML = '';
        spotifyResults.appendChild(loadingMessage);
    } else {
        youtubeResults.innerHTML = '';
        youtubeResults.appendChild(loadingMessage);
    }
}

// Hide loading indicator
function hideLoadingIndicator(type) {
    if (type === 'spotify') {
        const loadingMessage = spotifyResults.querySelector('.loading');
        if (loadingMessage) {
            spotifyResults.removeChild(loadingMessage);
        }
    } else {
        const loadingMessage = youtubeResults.querySelector('.loading');
        if (loadingMessage) {
            youtubeResults.removeChild(loadingMessage);
        }
    }
}

// Show error message
function showErrorMessage(message) {
    alert(message);
}

// Add to search history
function addToSearchHistory(type, query) {
    let history = JSON.parse(localStorage.getItem('searchHistory')) || {};
    if (!history[type]) {
        history[type] = [];
    }
    history[type].push(query);
    localStorage.setItem('searchHistory', JSON.stringify(history));
    loadSearchHistory();
}

// Load search history
function loadSearchHistory() {
    searchHistory.innerHTML = '';
    let history = JSON.parse(localStorage.getItem('searchHistory')) || {};

    for (const type in history) {
        const typeHeader = document.createElement('h3');
        typeHeader.textContent = `${type.charAt(0).toUpperCase() + type.slice(1)} Search History`;
        searchHistory.appendChild(typeHeader);

        const typeList = document.createElement('ul');
        history[type].forEach(query => {
            const queryItem = document.createElement('li');
            queryItem.textContent = query;
            typeList.appendChild(queryItem);
        });

        searchHistory.appendChild(typeList);
    }
}

// Clear search history
function clearSearchHistory() {
    localStorage.removeItem('searchHistory');
    loadSearchHistory();
}

// Close video player
function closeVideoPlayer() {
    videoContainer.style.display = 'none';
    videoPlayer.src = '';
}

// Event listener for closing video player
videoPlayer.addEventListener('ended', closeVideoPlayer);
