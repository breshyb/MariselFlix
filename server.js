const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname)));

// Routes for all pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/search', (req, res) => {
  res.sendFile(path.join(__dirname, 'search.html'));
});

app.get('/details', (req, res) => {
  res.sendFile(path.join(__dirname, 'details.html'));
});

app.get('/player', (req, res) => {
  res.sendFile(path.join(__dirname, 'player.html'));
});

app.get('/category/:name', (req, res) => {
  res.sendFile(path.join(__dirname, 'category.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Marisel Flix server running on port ${PORT}`);
});
