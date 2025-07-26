// BACKEND: index.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const sessions = {};
const pushTokens = {}; // phone -> token

app.get('/ping', (req, res) => {
  res.json({ message: 'pong' });
});

// Register push token
app.post('/register-push-token', (req, res) => {
  const { phone, token } = req.body;
  if (!phone || !token) return res.status(400).json({ error: 'Missing phone or token' });
  pushTokens[phone] = token;
  res.json({ success: true });
});

// Start session and send push invite
app.post('/start-session', async (req, res) => {
  const { target, hashes } = req.body;
  if (!target || !Array.isArray(hashes)) return res.status(400).json({ error: 'Invalid input' });

  sessions[target] = {
    user1: hashes,
    user1Revealed: false,
    user2Revealed: false
  };

  // Auto-expire in 30 min
  setTimeout(() => delete sessions[target], 30 * 60 * 1000);

  const token = pushTokens[target];
  if (token) {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: token,
        sound: 'default',
        title: 'Contact Match Request',
        body: 'Someone wants to compare contacts with you.',
        data: { inviter: target }
      })
    });
  }

  res.json({ success: true });
});

// Join session
app.post('/join-session', (req, res) => {
  const { phone, hashes } = req.body;
  const session = sessions[phone];
  if (!session || !Array.isArray(hashes)) return res.status(400).json({ error: 'Invalid or expired session' });

  session.user2 = hashes;
  const matches = hashes.filter(h => session.user1.includes(h));
  session.matches = matches;
  res.json({ matches });
});

// Reveal logic
app.post('/session/:id/reveal', (req, res) => {
  const { id } = req.params;
  const session = sessions[id];
  if (!session || !session.user1 || !session.user2) return res.status(400).json({ error: 'Incomplete session' });
  session.revealRequestCount = (session.revealRequestCount || 0) + 1;
  if (session.revealRequestCount === 1) return res.json({ waiting: true });
  res.json({ ok: true });
});

app.get('/session/:id/reveal-status', (req, res) => {
  const { id } = req.params;
  const session = sessions[id];
  if (!session || !session.matches) return res.status(404).json({ error: 'No match info' });
  res.json({ mutualHashes: session.matches });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
