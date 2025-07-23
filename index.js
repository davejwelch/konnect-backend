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
    sessions[code] = { first: hashes };
    return res.json({ waiting: true });
  } else {
    // Second user joins; compare with first user
    const firstHashes = sessions[code].first;
    const matches = hashes.filter(h => firstHashes.includes(h));
    delete sessions[code]; // Clear session after match
    return res.json({ matches });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
