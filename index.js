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
    sessions[code] = {
      user1: hashes,
      user1Revealed: false,
      user2Revealed: false,
    };

    // Auto-delete after 30 minutes
    setTimeout(() => {
      delete sessions[code];
      console.log(`Session ${code} deleted after 30 minutes`);
    }, 30 * 60 * 1000);

    return res.json({ waiting: true });
  }

  if (!sessions[code].user2) {
    sessions[code].user2 = hashes;
    const user1 = sessions[code].user1;
    const matches = hashes.filter(h => user1.includes(h));
    sessions[code].matches = matches;
    return res.json({ matches });
  }

  return res.status(400).json({ error: 'This code has already been used by two people. Please try a new one.' });
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

  // Track number of reveal requests
  if (!session.revealRequestCount) session.revealRequestCount = 1;
  else session.revealRequestCount++;

  if (session.revealRequestCount === 1) {
    return res.json({ waiting: true });
  }

  return res.json({ ok: true }); // Frontend will begin polling
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
