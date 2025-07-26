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

// 🚀 Invite flow: start or join by phone
app.post('/invite/:phone', (req, res) => {
  const phone = req.params.phone;
  const { hashes } = req.body;

  if (!Array.isArray(hashes)) {
    return res.status(400).json({ error: 'hashes must be an array' });
  }

  console.log(`Invite join for ${phone}: ${hashes.length} hashes`);

  if (!sessions[phone]) {
    sessions[phone] = {
      user1: hashes,
      user1Revealed: false,
      user2Revealed: false,
    };

    setTimeout(() => {
      delete sessions[phone];
      console.log(`Session ${phone} deleted after 30 minutes`);
    }, 30 * 60 * 1000);

    return res.json({ waiting: true });
  }

  if (!sessions[phone].user2) {
    sessions[phone].user2 = hashes;
    const user1 = sessions[phone].user1;
    const matches = hashes.filter(h => user1.includes(h));
    sessions[phone].matches = matches;
    return res.json({ matches });
  }

  return res.status(400).json({ error: 'Session already full' });
});

// ✏️ Legacy code-based flow (fallback)
app.post('/session/:code', (req, res) => {
  const { code } = req.params;
  const { hashes } = req.body;

  if (!Array.isArray(hashes)) {
    return res.status(400).json({ error: 'hashes must be an array' });
  }

  if (!sessions[code]) {
    sessions[code] = {
      user1: hashes,
      user1Revealed: false,
      user2Revealed: false,
    };

    setTimeout(() => {
      delete sessions[code];
      console.log(`Session ${code} deleted after 30 minutes`);
    }, 30 * 60 * 1000);

    return res.json({ waiting: true });
  }

  if (!sessions[code].user2) {
    sessions[code].user2 = hashes;
    const matches = hashes.filter(h => sessions[code].user1.includes(h));
    sessions[code].matches = matches;
    return res.json({ matches });
  }

  return res.status(400).json({ error: 'Code already in use by two users. Please generate a new one.' });
});

// Reveal flow (shared for both code and invite sessions)
app.post('/session/:id/reveal', (req, res) => {
  const { id } = req.params;

  if (!sessions[id]) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const session = sessions[id];

  if (!session.user1 || !session.user2) {
    return res.status(400).json({ error: 'Both users must join first' });
  }

  if (!session.revealRequestCount) session.revealRequestCount = 1;
  else session.revealRequestCount++;

  if (session.revealRequestCount === 1) {
    return res.json({ waiting: true });
  }

  return res.json({ ok: true });
});

app.get('/session/:id/reveal-status', (req, res) => {
  const { id } = req.params;

  if (!sessions[id]) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const session = sessions[id];

  if (Array.isArray(session.matches)) {
    return res.json({ mutualHashes: session.matches });
  }

  return res.json({ waiting: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
