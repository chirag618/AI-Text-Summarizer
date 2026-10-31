'use strict';

const express = require('express');
const path = require('path');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Read JSON request bodies (up to 2 MB)
app.use(express.json({ limit: '2mb' }));

// Serve the frontend (HTML, CSS, JS) from the sibling "frontend" folder
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// API routes
app.use('/api', apiRoutes);

// Unknown API paths
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found.' });
});

// Error handler (bad JSON, body too large, etc.)
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request is too large. Try a shorter text.' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Server error.' });
});

app.listen(PORT, () => {
  console.log('AI Text Summarizer running at http://localhost:' + PORT);
});
