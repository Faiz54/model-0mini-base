// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const fetch = require('node-fetch'); // Ensure you have installed node-fetch@2
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Use morgan for HTTP request logging.
app.use(morgan('combined'));

// Basic rate limiting middleware.
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
});
app.use(limiter);

// Serve static files from the "public" folder.
app.use(express.static(path.join(__dirname, 'public')));

// Parse JSON bodies for incoming requests.
app.use(express.json());

// Helper function: Extract response content from Gemini API response.
function extractResponseContent(data) {
  if (data.candidates && Array.isArray(data.candidates) && data.candidates.length > 0) {
    const firstCandidate = data.candidates[0];
    if (
      firstCandidate.content &&
      firstCandidate.content.parts &&
      Array.isArray(firstCandidate.content.parts) &&
      firstCandidate.content.parts.length > 0 &&
      firstCandidate.content.parts[0].text
    ) {
      return firstCandidate.content.parts[0].text;
    } else {
      console.warn("Unexpected 'candidates' structure:", data);
    }
  } else if (
    data.choices && Array.isArray(data.choices) && data.choices.length > 0 &&
    data.choices[0].message && data.choices[0].message.content
  ) {
    return data.choices[0].message.content;
  } else {
    console.warn("Unexpected response structure:", data);
  }
  return "No valid response returned.";
}

// API endpoint to handle chat requests (proxies to Gemini API).
app.post('/api/chat', async (req, res) => {
  const { prompt } = req.body;
  console.log("Received prompt:", prompt);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      }
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log("Received data from Gemini API:", JSON.stringify(data, null, 2));
    const content = extractResponseContent(data);
    
    // Emit chat event for real-time admin monitoring.
    io.emit('chat', { prompt, response: content, ip: req.ip });
    
    res.json({ response: content });
  } catch (error) {
    console.error("Error in /api/chat:", error);
    res.status(500).json({ error: "Error fetching chat response" });
  }
});

// Route to serve the admin dashboard.
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Set up Socket.io for real-time admin monitoring.
io.on('connection', (socket) => {
  console.log('Admin connected: ' + socket.id);
  socket.on('disconnect', () => {
    console.log('Admin disconnected: ' + socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
