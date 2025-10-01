# YouTube Analytics Dashboard

A beautiful YouTube channel analytics tracking dashboard with dark mode support.

## Features

- ✅ Add YouTube channels by URL
- ✅ Real-time channel statistics from YouTube API
- ✅ Dark/Light mode toggle
- ✅ Data persistence with MongoDB
- ✅ Responsive design
- ✅ Deploy to Vercel in 2 minutes

## Tech Stack

- **Frontend**: Vanilla JavaScript, HTML, CSS
- **Backend**: Node.js, Express
- **Database**: MongoDB Atlas
- **API**: YouTube Data API v3
- **Hosting**: Vercel

## Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup API Keys

Create a `.env` file:
```bash
cp .env.example .env
```

Edit `.env` and add:
```env
YOUTUBE_API_KEY=your_youtube_api_key_here
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
```

**Get YouTube API Key:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Enable **YouTube Data API v3**
3. Create API Key

**Get MongoDB:**
1. Create free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Copy connection string

### 3. Run the Application
```bash
npm start
```

This will start:
- Backend: `http://localhost:3001`
- Frontend: `http://localhost:2000`

## Deploy to Production

See [DEPLOY.md](DEPLOY.md) for detailed deployment instructions to Vercel.
