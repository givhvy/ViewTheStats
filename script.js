// YouTube Channel Statistics App - Vanilla JavaScript Version

class YouTubeChannelApp {
    constructor() {
        this.channels = [];
        this.dailySummary = { newVideosToday: 0, newViewsToday: 0 };
        this.initTheme();
        this.initEventListeners();
        this.loadChannelsFromAPI();
        this.loadDailySummary();
    }

    // Initialize theme
    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);
    }

    // Toggle theme
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.updateThemeIcon(newTheme);
    }

    // Update theme icon
    updateThemeIcon(theme) {
        const themeToggle = document.querySelector('.theme-toggle');
        if (themeToggle) {
            themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
        }
        const themeLabel = document.querySelector('.theme-label');
        if (themeLabel) {
            themeLabel.textContent = `Theme: ${theme === 'dark' ? 'Dark' : 'Light'}`;
        }
    }

    // Load channels from API/Firebase
    async loadChannelsFromAPI() {
        try {
            const apiUrl = `${this.getApiBaseUrl()}/api/channels`;
            const response = await fetch(apiUrl);

            if (response.ok) {
                this.channels = await response.json();
            } else {
                console.warn('Failed to load channels from API, using empty list');
                this.channels = [];
            }
        } catch (error) {
            console.error('Error loading channels:', error);
            this.channels = [];
        } finally {
            this.renderChannels();
            this.updateChannelCount();
            this.updateTotalVideosProgress();
        }
    }

    // Load daily summary stats
    async loadDailySummary() {
        try {
            const apiUrl = `${this.getApiBaseUrl()}/api/daily-summary`;
            const response = await fetch(apiUrl);

            if (response.ok) {
                this.dailySummary = await response.json();
                this.updateDailySummaryUI();
            }
        } catch (error) {
            console.error('Error loading daily summary:', error);
        }
    }

    // Update daily summary UI
    updateDailySummaryUI() {
        // Update "Total Revenue" card to show new videos
        const videosCard = document.querySelector('.metrics-row .metric-card:first-child');
        if (videosCard) {
            videosCard.querySelector('h3').textContent = 'Videos Uploaded Today';
            videosCard.querySelector('.metric-value').textContent = this.dailySummary.newVideosToday;
            videosCard.querySelector('.metric-change').textContent = `As of ${this.dailySummary.date || 'today'}`;
            videosCard.querySelector('.metric-change').className = 'metric-change';
        }

        // Update "Subscriptions" card to show new views
        const viewsCard = document.querySelector('.metrics-row .metric-card:last-child');
        if (viewsCard) {
            viewsCard.querySelector('h3').textContent = 'Views Gained Today';
            viewsCard.querySelector('.metric-value').textContent = this.formatNumber(this.dailySummary.newViewsToday);
            viewsCard.querySelector('.metric-change').textContent = `As of ${this.dailySummary.date || 'today'}`;
            viewsCard.querySelector('.metric-change').className = 'metric-change';
        }
    }

    // Initialize event listeners
    initEventListeners() {
        const form = document.getElementById('channelForm');
        const urlInput = document.getElementById('channelUrl');
        const themeToggle = document.querySelector('.theme-toggle');

        // Theme toggle
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddChannel();
        });

        // Enter key support
        urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleAddChannel();
            }
        });
    }

    // Extract channel ID from URL
    extractChannelId(url) {
        // Handle @username format
        const usernameMatch = url.match(/youtube\.com\/@([^\/\?]+)/);
        if (usernameMatch) {
            return `@${usernameMatch[1]}`;
        }

        // Handle channel/ID format
        const channelMatch = url.match(/youtube\.com\/channel\/([^\/\?]+)/);
        if (channelMatch) {
            return channelMatch[1];
        }

        // Handle c/username format
        const cMatch = url.match(/youtube\.com\/c\/([^\/\?]+)/);
        if (cMatch) {
            return `c/${cMatch[1]}`;
        }

        // Handle user/username format
        const userMatch = url.match(/youtube\.com\/user\/([^\/\?]+)/);
        if (userMatch) {
            return `user/${userMatch[1]}`;
        }

        return null;
    }

    // Get API base URL (supports both local and production)
    getApiBaseUrl() {
        return window.location.hostname === 'localhost'
            ? 'http://localhost:3002'
            : window.location.origin;
    }

    // Fetch real channel data from backend API
    async fetchChannelData(url) {
        const apiUrl = `${this.getApiBaseUrl()}/api/channel`;
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch channel data');
        }

        return await response.json();
    }

    // Format numbers with K/M suffixes
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toLocaleString();
    }

    // Show error message
    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }

    // Hide error message
    hideError() {
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.style.display = 'none';
    }

    // Set loading state
    setLoading(isLoading) {
        const button = document.getElementById('addButton');
        const buttonText = document.getElementById('buttonText');
        const loadingText = document.getElementById('loadingText');
        const input = document.getElementById('channelUrl');

        button.disabled = isLoading;
        input.disabled = isLoading;

        if (isLoading) {
            buttonText.style.display = 'none';
            loadingText.style.display = 'inline';
        } else {
            buttonText.style.display = 'inline';
            loadingText.style.display = 'none';
        }
    }

    // Handle adding a new channel
    async handleAddChannel() {
        const urlInput = document.getElementById('channelUrl');
        const url = urlInput.value.trim();

        if (!url) {
            this.showError('Please enter a YouTube channel URL');
            return;
        }

        const channelId = this.extractChannelId(url);
        if (!channelId) {
            this.showError('Invalid YouTube channel URL. Please use format: https://youtube.com/@channelname or https://youtube.com/channel/CHANNEL_ID');
            return;
        }

        // Check if channel already exists
        if (this.channels.some(channel => channel.id === channelId)) {
            this.showError('This channel is already in your list');
            return;
        }

        this.hideError();
        this.setLoading(true);

        try {
            // Fetch real channel data from backend (also saves to Firebase)
            const channelData = await this.fetchChannelData(url);

            // Add to local channels list
            this.channels.push(channelData);

            // Clear input
            urlInput.value = '';

            // Re-render
            this.renderChannels();
            this.updateChannelCount();
            this.updateTotalVideosProgress();

            // Reload daily summary after adding channel
            this.loadDailySummary();

        } catch (error) {
            console.error('Error adding channel:', error);
            this.showError(error.message || 'An error occurred while adding the channel');
        } finally {
            this.setLoading(false);
        }
    }

    // Edit channel note
    async editChannelNote(channelId, currentNote) {
        const newNote = prompt('Enter a note for this channel (e.g., "c1"):', currentNote || '');

        if (newNote === null) return; // User cancelled

        try {
            const apiUrl = `${this.getApiBaseUrl()}/api/channel/${channelId}/note`;
            const response = await fetch(apiUrl, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ note: newNote.trim() })
            });

            if (response.ok) {
                // Update local channel
                const channel = this.channels.find(ch => ch.id === channelId);
                if (channel) {
                    channel.note = newNote.trim();
                    this.renderChannels();
                }
            } else {
                alert('Failed to update note');
            }
        } catch (error) {
            console.error('Error updating note:', error);
            alert('Error updating note');
        }
    }

    // Remove a channel
    async removeChannel(channelId) {
        if (!confirm('Are you sure you want to remove this channel?')) {
            return;
        }

        try {
            // Delete from backend/Firebase
            const apiUrl = `${this.getApiBaseUrl()}/api/channel/${channelId}`;
            const response = await fetch(apiUrl, {
                method: 'DELETE'
            });

            if (response.ok) {
                // Remove from local list
                this.channels = this.channels.filter(channel => channel.id !== channelId);
                this.renderChannels();
                this.updateChannelCount();
                this.updateTotalVideosProgress();
            } else {
                alert('Failed to delete channel');
            }
        } catch (error) {
            console.error('Error deleting channel:', error);
            alert('Error deleting channel');
        }
    }

    // Update channel count
    updateChannelCount() {
        const countElement = document.getElementById('channelCount');
        countElement.textContent = this.channels.length;
    }

    // Update total videos progress
    updateTotalVideosProgress() {
        const GOAL = 40000;

        // Calculate total videos from all channels
        const totalVideos = this.channels.reduce((sum, channel) => sum + (channel.videoCount || 0), 0);

        // Calculate percentage
        const percentage = Math.min(100, (totalVideos / GOAL) * 100);

        // Update UI
        const countElement = document.getElementById('totalVideosCount');
        const progressBar = document.getElementById('progressBar');
        const progressPercentage = document.getElementById('progressPercentage');

        if (countElement) {
            countElement.textContent = this.formatNumber(totalVideos);
        }

        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }

        if (progressPercentage) {
            progressPercentage.textContent = `${percentage.toFixed(1)}%`;
        }
    }

    // Render all channels
    renderChannels() {
        const channelsList = document.getElementById('channelsList');
        const emptyState = document.getElementById('emptyState');

        if (this.channels.length === 0) {
            emptyState.style.display = 'block';
            // Remove any existing channel cards
            const existingCards = channelsList.querySelectorAll('.channel-card');
            existingCards.forEach(card => card.remove());
            return;
        }

        emptyState.style.display = 'none';

        // Clear existing cards
        const existingCards = channelsList.querySelectorAll('.channel-card');
        existingCards.forEach(card => card.remove());

        // Create new cards
        this.channels.forEach(channel => {
            const channelCard = this.createChannelCard(channel);
            channelsList.appendChild(channelCard);
        });
    }

    // Create a single channel card
    createChannelCard(channel) {
        const card = document.createElement('div');
        card.className = 'channel-card';

        card.innerHTML = `
            <img src="${channel.thumbnail}" alt="${channel.title}" class="channel-avatar" onerror="this.src='https://via.placeholder.com/60x60/667eea/white?text=${channel.title.charAt(0)}'">
            <div class="channel-info">
                <div class="channel-title">
                    ${channel.title}
                    ${channel.note ? `<span class="channel-note">${channel.note}</span>` : ''}
                </div>
                <div class="channel-stats">
                    <div class="stat-item">
                        <div class="stat-label">Videos</div>
                        <div class="stat-value">${this.formatNumber(channel.videoCount)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Total Views</div>
                        <div class="stat-value">${this.formatNumber(channel.viewCount)}</div>
                    </div>
                </div>
            </div>
            <button class="edit-note-button" onclick="app.editChannelNote('${channel.id}', '${(channel.note || '').replace(/'/g, "\\'")}')" title="Edit note">
                ✏️
            </button>
            <button class="remove-button" onclick="app.removeChannel('${channel.id}')">
                Remove
            </button>
        `;

        return card;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new YouTubeChannelApp();
});