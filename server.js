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
  try {
    const response = await axios.post('https://accounts.spotify.com/api/token', new URLSearchParams({
      grant_type: 'client_credentials'
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64')
      }
    });
    return response.data.access_token;
  } catch (error) {
    console.error('Error fetching access token:', error);
    throw new Error('Failed to fetch access token');
  }
}

async function getScrapedData(trackId) {
  try {
    const url = `https://open.spotify.com/embed/track/${trackId}?utm_source=discord&utm_medium=desktop`;
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    let trackData = null;

    // Extract JSON data from <script id="__NEXT_DATA__">
    $('script#__NEXT_DATA__').each((i, script) => {
      const scriptContent = $(script).html();
      try {
        const jsonData = JSON.parse(scriptContent);
        const track = jsonData.props.pageProps.state.data.entity;

        trackData = {
          name: track.name,
          artists: track.artists.map(artist => artist.name).join(', '),
          coverArt: track.coverArt.sources[0]?.url || 'https://via.placeholder.com/150', // Fallback URL
          releaseDate: track.releaseDate?.isoString || 'N/A',
          duration: track.duration || 'N/A',
          audioPreviewUrl: track.audioPreview?.url || ''
        };
      } catch (error) {
        console.error('Error parsing JSON:', error);
      }
    });

    return trackData || { coverArt: 'https://via.placeholder.com/150' }; // Default to placeholder if no data
  } catch (error) {
    console.error('Error scraping data:', error);
    return { coverArt: 'https://via.placeholder.com/150' }; // Default to placeholder if error
  }
}

app.get('/api/token', async (req, res) => {
  try {
    const token = await getAccessToken();
    res.json({ token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/scrape', async (req, res) => {
  const { trackIds } = req.body;
  try {
    const scrapePromises = trackIds.map(async (trackId) => {
      const scrapedData = await getScrapedData(trackId);
      return { trackId, scrapedData };
    });

    const results = await Promise.all(scrapePromises);
    res.json(results);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
