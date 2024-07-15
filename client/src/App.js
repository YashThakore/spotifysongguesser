import React, { useState } from 'react';
import axios from 'axios';
import SpotifyWebApi from 'spotify-web-api-js';

const spotifyApi = new SpotifyWebApi();

function App() {
  const [artistName, setArtistName] = useState('');
  const [songs, setSongs] = useState([]);

  const fetchSongs = async () => {
    try {
      // Get the access token from the backend
      const tokenResponse = await axios.get('http://localhost:5000/api/token');
      const accessToken = tokenResponse.data.token;

      // Log the access token
      console.log('Access Token:', accessToken);

      // Set the access token for the Spotify API
      spotifyApi.setAccessToken(accessToken);

      // Search for the artist by name
      const artistResponse = await spotifyApi.searchArtists(artistName);
      console.log('Artist Search Response:', artistResponse);

      if (artistResponse.artists.items.length > 0) {
        const artistId = artistResponse.artists.items[0].id;

        // Get the artist's albums
        const albumsResponse = await spotifyApi.getArtistAlbums(artistId, { include_groups: 'album,single' });
        const albumIds = albumsResponse.items.map(album => album.id);

        console.log('Album IDs:', albumIds);

        let allTracks = [];
        for (const albumId of albumIds) {
          // Get the tracks for each album
          const tracksResponse = await spotifyApi.getAlbumTracks(albumId);
          allTracks = allTracks.concat(tracksResponse.items);
        }

        console.log('All Tracks:', allTracks);

        // Fetch audioPreview URLs for each track
        const trackDetailsPromises = allTracks.map(async (track) => {
          const response = await axios.post('http://localhost:5000/api/preview-url', { trackId: track.id });
          console.log(`Preview URL for track ${track.id}:`, response.data.audioPreviewUrl); // Log preview URL response
          return {
            name: track.name,
            preview_url: response.data.audioPreviewUrl
          };
        });

        const trackDetails = await Promise.all(trackDetailsPromises);
        console.log('Track Details with Preview URLs:', trackDetails);

        // Filter tracks with preview URLs
        const tracksWithPreviews = trackDetails.filter(track => track.preview_url);
        setSongs(tracksWithPreviews);
      } else {
        setSongs([]);
        console.log('Artist not found');
      }
    } catch (error) {
      console.error('Error fetching songs:', error);
    }
  };

  return (
    <div className="App">
      <h1>Spotify Song Fetcher</h1>
      <input
        type="text"
        value={artistName}
        onChange={(e) => setArtistName(e.target.value)}
        placeholder="Enter artist name"
      />
      <button onClick={fetchSongs}>Fetch Songs</button>
      <ul>
        {songs.map((song, index) => (
          <li key={index}>
            {song.name}
            {song.preview_url ? (
              <audio controls>
                <source src={song.preview_url} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            ) : (
              <span> (No preview available) </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
