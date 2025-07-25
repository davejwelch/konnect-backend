const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const sessions = {};

app.get('/ping', (req, res) => {
  console.log('/ping called');
  res.json({ message: 'pong' });
});

app.post('/session/:code', (req, res) => {
  const { code } = req.params;
  const { hashes } = req.body;

  if (!Array.isArray(hashes)) {
    return res.status(400).json({ error: 'hashes must be an array' });
  }

  if (!sessions[code]) {
    // First user to join this session
    sessions[code] = {
      user1: hashes,
      user1Revealed: false,
      user2Revealed: false,
    };
    return res.json({ waiting: true });
  } else if (!sessions[code].user2) {
    // Second user joins
    sessions[code].user2 = hashes;
    const user1 = sessions[code].user1;
    const matches = hashes.filter(h => user1.includes(h));
    sessions[code].matches = matches;
    return res.json({ matches });
  } else {
    // Session already full
    return res.status(400).json({ error: 'Session full or expired' });
  }
});

app.post('/session/:code/reveal', (req, res) => {
  const { code } = req.params;

  if (!sessions[code]) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const session = sessions[code];

  if (!session.user1 || !session.user2) {
    return res.status(400).json({ error: 'Both users must join first' });
  }

  // Simulate per-client reveal toggle — in production you'd use auth/session
  if (!session.revealRequestCount) session.revealRequestCount = 1;
  else session.revealRequestCount++;

  if (session.revealRequestCount === 1) {
    return res.json({ waiting: true });
  }

  return res.json({ ok: true }); // Frontend will start polling
});

app.get('/session/:code/reveal-status', (req, res) => {
  const { code } = req.params;

  if (!sessions[code]) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const session = sessions[code];

  if (session.revealRequestCount === 2 && Array.isArray(session.matches)) {
    return res.json({ mutualHashes: session.matches });
  } else {
    return res.json({ waiting: true });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
