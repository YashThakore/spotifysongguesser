import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import SpotifyWebApi from 'spotify-web-api-js';
import './App.css';

const spotifyApi = new SpotifyWebApi();

function App() {
  const [artistName, setArtistName] = useState('');
  const [songs, setSongs] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [options, setOptions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [gameStarted, setGameStarted] = useState(false);

  const audioRef = useRef(null);

  useEffect(() => {
    if (audioRef.current && currentSong) {
      audioRef.current.play();
    }
  }, [currentSong]);

  const fetchSongs = async (artist) => {
    setLoading(true);
    setError('');
    setShowResults(false);
    setGameStarted(true);
    try {
      const tokenResponse = await axios.get('http://localhost:5000/api/token');
      const accessToken = tokenResponse.data.token;

      const spotifyApiUrl = 'https://api.spotify.com/v1';
      const headers = { Authorization: `Bearer ${accessToken}` };

      const artistToSearch = artist || artistName;
      const artistResponse = await axios.get(`${spotifyApiUrl}/search`, {
        headers,
        params: { q: artistToSearch, type: 'artist' },
      });

      if (artistResponse.data.artists.items.length > 0) {
        const artistId = artistResponse.data.artists.items[0].id;

        const albumsResponse = await axios.get(`${spotifyApiUrl}/artists/${artistId}/albums`, {
          headers,
          params: { include_groups: 'album,single' },
        });
        const albumIds = albumsResponse.data.items.map((album) => album.id);

        let allTracks = [];
        for (const albumId of albumIds) {
          const tracksResponse = await axios.get(`${spotifyApiUrl}/albums/${albumId}/tracks`, {
            headers,
          });
          allTracks = allTracks.concat(tracksResponse.data.items);
        }

        const trackDetailsPromises = allTracks.map((track) =>
          axios.get(`${spotifyApiUrl}/tracks/${track.id}`, { headers })
        );
        const trackDetailsResponses = await Promise.all(trackDetailsPromises);
        const detailedTracks = trackDetailsResponses.map((response) => response.data);

        const randomSongs = detailedTracks.sort(() => 0.5 - Math.random()).slice(0, 15);
        setSongs(randomSongs);
        setCurrentSong(randomSongs[0]);
        setOptions(generateOptions(randomSongs[0], randomSongs));
      } else {
        setSongs([]);
        setError('Artist not found');
      }
    } catch (error) {
      console.error('Error fetching songs:', error);
      setError('Failed to fetch songs');
    } finally {
      setLoading(false);
    }
  };

  const generateOptions = (correctSong, allSongs) => {
    const options = [correctSong];
    while (options.length < 4) {
      const randomSong = allSongs[Math.floor(Math.random() * allSongs.length)];
      if (!options.includes(randomSong)) {
        options.push(randomSong);
      }
    }
    return options.sort(() => 0.5 - Math.random());
  };

  const handleOptionClick = (song) => {
    if (song.id === currentSong.id) {
      setScore(score + 1);
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex < songs.length) {
      setCurrentIndex(nextIndex);
      const nextSong = songs[nextIndex];
      setCurrentSong(nextSong);
      setOptions(generateOptions(nextSong, songs));
    } else {
      setGameStarted(false);
      setShowResults(true);
    }
  };

  const popularArtists = [
    'Taylor Swift',
    'Imagine Dragons',
    'BTS',
    'NCT DREAM',
  ];

  return (
    <div className="App">
      <div className="header">
        <div className="logo">🎧 MUSIC NERD</div>
        <div className="stats">701.8k quizzes played</div>
      </div>
      <div className="container">
        {!gameStarted ? (
          <>
            <h1>Are you a true music fan?</h1>
            <p>Guess the track within 5 seconds</p>
            <input
              type="text"
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              placeholder="Type an artist's name"
            />
            <button onClick={() => fetchSongs()} disabled={loading}>
              {loading ? 'Loading...' : "Let's go"}
            </button>
            {error && <p className="error-message">{error}</p>}
            <div className="popular-artists">
              {popularArtists.map((artist) => (
                <div
                  key={artist}
                  className="popular-artist"
                  onClick={() => fetchSongs(artist)}
                >
                  {artist}
                </div>
              ))}
            </div>
          </>
        ) : showResults ? (
          <div className="results">
            <h2>Your Score: {score} / 15</h2>
            <button onClick={() => window.location.reload()}>Play Again</button>
          </div>
        ) : (
          <div>
            <h2>Play the track and pick the right song name</h2>
            {currentSong && (
              <div className="audio-container">
                <audio
                  ref={audioRef}
                  src={currentSong.preview_url || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'}
                  preload="auto"
                  controls
                />
              </div>
            )}
            <div className="options-container">
              {options.map((option, index) => {
                const imageUrl = option.album && Array.isArray(option.album.images) && option.album.images.length > 0
                  ? option.album.images[0].url
                  : 'https://via.placeholder.com/150';
                return (
                  <div key={index} className="option" onClick={() => handleOptionClick(option)}>
                    <img
                      src={imageUrl}
                      alt="Cover Art"
                      className="cover-art"
                    />
                    <p>{option.name}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
