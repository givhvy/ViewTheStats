const express = require('express');
const cors = require('cors');
const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();
const connectDB = require('./db');
const Channel = require('./models/Channel');

const app = express();
const PORT = process.env.PORT || 3001;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// YouTube API configuration
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// Helper function to extract channel ID/username from URL
function extractChannelIdentifier(url) {
    // Handle @username format
    const usernameMatch = url.match(/youtube\.com\/@([^\/\?]+)/);
    if (usernameMatch) {
        return { type: 'username', value: usernameMatch[1] };
    }

    // Handle channel/ID format
    const channelMatch = url.match(/youtube\.com\/channel\/([^\/\?]+)/);
    if (channelMatch) {
        return { type: 'id', value: channelMatch[1] };
    }

    // Handle c/username format
    const cMatch = url.match(/youtube\.com\/c\/([^\/\?]+)/);
    if (cMatch) {
        return { type: 'username', value: cMatch[1] };
    }

    // Handle user/username format
    const userMatch = url.match(/youtube\.com\/user\/([^\/\?]+)/);
    if (userMatch) {
        return { type: 'username', value: userMatch[1] };
    }

    return null;
}

// API endpoint to get channel data
app.post('/api/channel', async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'Channel URL is required' });
        }

        if (!YOUTUBE_API_KEY) {
            return res.status(500).json({
                error: 'YouTube API key is not configured. Please add YOUTUBE_API_KEY to .env file'
            });
        }

        const identifier = extractChannelIdentifier(url);
        if (!identifier) {
            return res.status(400).json({
                error: 'Invalid YouTube channel URL format'
            });
        }

        let channelData;

        // If we have a username/handle, first search for the channel
        if (identifier.type === 'username') {
            // For @handle format, use search API
            const searchResponse = await axios.get(`${YOUTUBE_API_BASE}/search`, {
                params: {
                    part: 'snippet',
                    q: identifier.value,
                    type: 'channel',
                    maxResults: 1,
                    key: YOUTUBE_API_KEY
                }
            });

            if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
                return res.status(404).json({
                    error: 'Channel not found'
                });
            }

            const channelId = searchResponse.data.items[0].id.channelId;

            // Now get full channel details
            const channelResponse = await axios.get(`${YOUTUBE_API_BASE}/channels`, {
                params: {
                    part: 'snippet,statistics,contentDetails',
                    id: channelId,
                    key: YOUTUBE_API_KEY
                }
            });

            channelData = channelResponse.data.items[0];
        } else {
            // Direct channel ID lookup
            const channelResponse = await axios.get(`${YOUTUBE_API_BASE}/channels`, {
                params: {
                    part: 'snippet,statistics,contentDetails',
                    id: identifier.value,
                    key: YOUTUBE_API_KEY
                }
            });

            if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
                return res.status(404).json({
                    error: 'Channel not found'
                });
            }

            channelData = channelResponse.data.items[0];
        }

        // Format the response
        const formattedData = {
            channelId: channelData.id,
            title: channelData.snippet.title,
            thumbnail: channelData.snippet.thumbnails.default.url,
            description: channelData.snippet.description,
            subscriberCount: parseInt(channelData.statistics.subscriberCount || 0),
            videoCount: parseInt(channelData.statistics.videoCount || 0),
            viewCount: parseInt(channelData.statistics.viewCount || 0),
            url: url,
            lastUpdated: new Date()
        };

        // Save to database if MongoDB is connected
        if (mongoose.connection.readyState === 1) {
            try {
                await Channel.findOneAndUpdate(
                    { channelId: channelData.id },
                    formattedData,
                    { upsert: true, new: true }
                );
            } catch (dbError) {
                console.error('Database save error:', dbError.message);
                // Continue even if DB save fails
            }
        }

        // Return formatted data with 'id' for frontend compatibility
        res.json({
            id: formattedData.channelId,
            ...formattedData,
            addedAt: Date.now()
        });

    } catch (error) {
        console.error('Error fetching channel data:', error.message);

        if (error.response) {
            // YouTube API error
            return res.status(error.response.status).json({
                error: error.response.data.error?.message || 'Failed to fetch channel data from YouTube API'
            });
        }

        res.status(500).json({
            error: 'Internal server error while fetching channel data'
        });
    }
});

// Get all channels from database
app.get('/api/channels', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ error: 'Database not connected' });
        }

        const channels = await Channel.find().sort({ createdAt: -1 });

        // Format for frontend compatibility
        const formattedChannels = channels.map(ch => ({
            id: ch.channelId,
            channelId: ch.channelId,
            title: ch.title,
            thumbnail: ch.thumbnail,
            description: ch.description,
            subscriberCount: ch.subscriberCount,
            videoCount: ch.videoCount,
            viewCount: ch.viewCount,
            url: ch.url,
            addedAt: ch.createdAt.getTime()
        }));

        res.json(formattedChannels);
    } catch (error) {
        console.error('Error fetching channels:', error);
        res.status(500).json({ error: 'Failed to fetch channels' });
    }
});

// Delete a channel
app.delete('/api/channel/:channelId', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ error: 'Database not connected' });
        }

        const { channelId } = req.params;
        await Channel.findOneAndDelete({ channelId });

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting channel:', error);
        res.status(500).json({ error: 'Failed to delete channel' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        apiKeyConfigured: !!YOUTUBE_API_KEY,
        dbConnected: mongoose.connection.readyState === 1
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    if (!YOUTUBE_API_KEY) {
        console.warn('⚠️  WARNING: YOUTUBE_API_KEY is not set in .env file!');
    }
});
