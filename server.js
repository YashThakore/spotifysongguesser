const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

async function getAccessToken() {
  const response = await axios.post('https://accounts.spotify.com/api/token', new URLSearchParams({
    grant_type: 'client_credentials'
  }), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64')
    }
  });
  return response.data.access_token;
}

async function getAudioPreview(trackId) {
  const url = `https://open.spotify.com/embed/track/${trackId}?utm_source=discord&utm_medium=desktop`;
  const response = await axios.get(url);
  const $ = cheerio.load(response.data);

  let audioPreviewUrl = null;
  $('script').each((i, script) => {
    const scriptContent = $(script).html();
    const match = scriptContent.match(/"audioPreview":"(.*?)"/);
    console.log(match)
    if (match && match[1]) {
      audioPreviewUrl = match[1].replace(/\\u002F/g, '/');
    }
  });

  return audioPreviewUrl;
}

app.get('/api/token', async (req, res) => {
  try {
    const token = await getAccessToken();
    res.json({ token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/preview-url', async (req, res) => {
  const { trackId } = req.body;
  try {
    const audioPreviewUrl = await getAudioPreview(trackId);
    res.json({ audioPreviewUrl });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
