const express = require('express');
const cors = require('cors');
const axios = require('axios');
const admin = require('firebase-admin');
require('dotenv').config();
const { initializeFirebase, getFirestore } = require('./firebase');

const app = express();
const PORT = process.env.PORT || 3002;

// Initialize Firebase
initializeFirebase();

// Middleware
app.use(cors());
app.use(express.json());

// In-memory cache for daily data (Vietnam time)
let dailyCache = {
    date: null, // Format: YYYY-MM-DD in Vietnam time
    data: null
};

// YouTube API configuration
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// Helper: Get current date in Vietnam timezone (UTC+7)
function getVietnamDate() {
    const now = new Date();
    const vietnamTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    return vietnamTime.toISOString().split('T')[0]; // YYYY-MM-DD
}

// Helper: Save daily stats snapshot to Firestore
async function saveDailySnapshot(channelId, videoCount, viewCount) {
    const db = getFirestore();
    if (!db) return;

    const today = getVietnamDate();

    try {
        await db.collection('dailyStats').doc(`${channelId}_${today}`).set({
            channelId,
            date: today,
            videoCount,
            viewCount,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.error('Error saving daily snapshot:', error.message);
    }
}

// Helper: Get previous day stats for a channel
async function getPreviousDayStats(channelId) {
    const db = getFirestore();
    if (!db) return null;

    const today = getVietnamDate();
    const yesterday = new Date(new Date(today) - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    try {
        const doc = await db.collection('dailyStats').doc(`${channelId}_${yesterday}`).get();
        if (doc.exists) {
            return doc.data();
        }
    } catch (error) {
        console.error('Error getting previous day stats:', error.message);
    }

    return null;
}

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
            lastUpdated: new Date().toISOString()
        };

        // Save to Firestore if available (only save channelId and URL, not stats)
        const db = getFirestore();
        if (db) {
            try {
                await db.collection('channels').doc(channelData.id).set({
                    channelId: channelData.id,
                    url: url,
                    title: channelData.snippet.title,
                    note: '',
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            } catch (dbError) {
                console.error('Firestore save error:', dbError.message);
                // Continue even if DB save fails
            }
        }

        // Return formatted data with 'id' for frontend compatibility
        res.json({
            id: formattedData.channelId,
            ...formattedData,
            note: '',
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

// Get all channels from Firestore and fetch real-time stats from YouTube API
app.get('/api/channels', async (req, res) => {
    try {
        const db = getFirestore();
        if (!db) {
            return res.status(503).json({ error: 'Database not connected' });
        }

        const today = getVietnamDate();

        // Always fetch latest notes from Firestore
        const snapshot = await db.collection('channels').orderBy('createdAt', 'desc').get();

        // Get list of channel IDs and notes from Firestore
        const channelIds = [];
        const channelData = {};
        snapshot.forEach(doc => {
            const data = doc.data();
            channelIds.push(doc.id);
            channelData[doc.id] = {
                url: data.url,
                note: data.note || '',
                description: data.description || '',
                detailDescription: data.detailDescription || '',
                addedAt: data.createdAt?.toMillis() || Date.now()
            };
        });

        if (channelIds.length === 0) {
            return res.json([]);
        }

        // Check cache for YouTube stats (but always use fresh notes)
        if (dailyCache.date === today && dailyCache.data) {
            console.log('✅ Using cached YouTube stats with fresh notes');

            // Merge cached stats with fresh notes and description from Firestore
            const channelsWithFreshNotes = dailyCache.data.map(channel => ({
                ...channel,
                note: channelData[channel.id]?.note || '',
                description: channelData[channel.id]?.description || '',
                detailDescription: channelData[channel.id]?.detailDescription || ''
            }));

            return res.json(channelsWithFreshNotes);
        }

        console.log('🔄 Fetching fresh data from YouTube API');

        // Fetch real-time stats from YouTube API (batch up to 50 channels per request)
        const channels = [];
        for (let i = 0; i < channelIds.length; i += 50) {
            const batchIds = channelIds.slice(i, i + 50);

            try {
                const channelResponse = await axios.get(`${YOUTUBE_API_BASE}/channels`, {
                    params: {
                        part: 'snippet,statistics',
                        id: batchIds.join(','),
                        key: YOUTUBE_API_KEY
                    }
                });

                if (channelResponse.data.items) {
                    for (const item of channelResponse.data.items) {
                        const videoCount = parseInt(item.statistics.videoCount || 0);
                        const viewCount = parseInt(item.statistics.viewCount || 0);

                        // Save daily snapshot for tracking
                        await saveDailySnapshot(item.id, videoCount, viewCount);

                        channels.push({
                            id: item.id,
                            channelId: item.id,
                            title: item.snippet.title,
                            thumbnail: item.snippet.thumbnails.default.url,
                            subscriberCount: parseInt(item.statistics.subscriberCount || 0),
                            videoCount,
                            viewCount,
                            url: channelData[item.id].url,
                            note: channelData[item.id].note,
                            description: channelData[item.id].description,
                            detailDescription: channelData[item.id].detailDescription,
                            addedAt: channelData[item.id].addedAt
                        });
                    }
                }
            } catch (apiError) {
                console.error('YouTube API error for batch:', apiError.message);
                // Continue with other batches even if one fails
            }
        }

        // Update cache (without notes to avoid stale data)
        dailyCache = {
            date: today,
            data: channels
        };

        res.json(channels);
    } catch (error) {
        console.error('Error fetching channels:', error);
        res.status(500).json({ error: 'Failed to fetch channels' });
    }
});

// Get daily summary (total new videos and views)
app.get('/api/daily-summary', async (req, res) => {
    try {
        const db = getFirestore();
        if (!db) {
            return res.status(503).json({ error: 'Database not connected' });
        }

        const today = getVietnamDate();

        // Get all today's snapshots
        const todaySnapshot = await db.collection('dailyStats')
            .where('date', '==', today)
            .get();

        if (todaySnapshot.empty) {
            return res.json({
                newVideosToday: 0,
                newViewsToday: 0,
                date: today
            });
        }

        let totalNewVideos = 0;
        let totalNewViews = 0;

        // For each channel, compare with yesterday's data
        for (const doc of todaySnapshot.docs) {
            const todayData = doc.data();
            const channelId = todayData.channelId;

            // Get yesterday's data
            const previousData = await getPreviousDayStats(channelId);

            if (previousData) {
                const videoDiff = todayData.videoCount - previousData.videoCount;
                const viewDiff = todayData.viewCount - previousData.viewCount;

                totalNewVideos += Math.max(0, videoDiff);
                totalNewViews += Math.max(0, viewDiff);
            } else {
                // First day for this channel, count all as new
                totalNewVideos += todayData.videoCount;
                totalNewViews += todayData.viewCount;
            }
        }

        res.json({
            newVideosToday: totalNewVideos,
            newViewsToday: totalNewViews,
            date: today
        });
    } catch (error) {
        console.error('Error getting daily summary:', error);
        res.status(500).json({ error: 'Failed to get daily summary' });
    }
});

// Update channel note
app.patch('/api/channel/:channelId/note', async (req, res) => {
    try {
        const db = getFirestore();
        if (!db) {
            return res.status(503).json({ error: 'Database not connected' });
        }

        const { channelId } = req.params;
        const { note, description, detailDescription } = req.body;

        const updateData = {};
        if (note !== undefined) updateData.note = note || '';
        if (description !== undefined) updateData.description = description || '';
        if (detailDescription !== undefined) updateData.detailDescription = detailDescription || '';

        // Use set with merge to create document if it doesn't exist
        await db.collection('channels').doc(channelId).set(updateData, { merge: true });

        // No need to clear cache - notes are always fetched fresh from Firestore
        res.json({ success: true, ...updateData });
    } catch (error) {
        console.error('Error updating note:', error);
        res.status(500).json({ error: 'Failed to update note' });
    }
});

// Delete a channel
app.delete('/api/channel/:channelId', async (req, res) => {
    try {
        const db = getFirestore();
        if (!db) {
            return res.status(503).json({ error: 'Database not connected' });
        }

        const { channelId } = req.params;
        await db.collection('channels').doc(channelId).delete();

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting channel:', error);
        res.status(500).json({ error: 'Failed to delete channel' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    const db = getFirestore();
    res.json({
        status: 'ok',
        apiKeyConfigured: !!YOUTUBE_API_KEY,
        firestoreConnected: !!db
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    if (!YOUTUBE_API_KEY) {
        console.warn('⚠️  WARNING: YOUTUBE_API_KEY is not set in .env file!');
    }
});
