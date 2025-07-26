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

// Invite or join via phone number
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

// Simulated push notification trigger (mock)
app.post('/notify/:phone', (req, res) => {
  const phone = req.params.phone;
  console.log(`Mock push notification to ${phone}`);
  res.json({ success: true });
});

// Reveal step (shared by invite or code flow)
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

// Reveal poll
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
