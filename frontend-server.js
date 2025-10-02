const express = require('express');
const path = require('path');

const app = express();
const PORT = 1000;

// Serve static files from current directory
app.use(express.static(__dirname));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🎨 Frontend server running on http://localhost:${PORT}`);
});
