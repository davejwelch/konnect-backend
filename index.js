const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

let lastUserHashes = [];

app.get('/ping', (req, res) => {
  res.send('pong');
});

app.post('/match', (req, res) => {
  const { hashes } = req.body;

  if (!Array.isArray(hashes)) {
    return res.status(400).json({ error: 'hashes must be an array' });
  }

  if (lastUserHashes.length === 0) {
    lastUserHashes = hashes;
    return res.json({ matches: [] });
  } else {
    const matches = hashes.filter(h => lastUserHashes.includes(h));
    lastUserHashes = [];
    return res.json({ matches });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
