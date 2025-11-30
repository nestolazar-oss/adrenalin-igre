import fetch from 'node-fetch';

const GIF_API = {
  // Tenor API
  tenor: async (query, limit = 5) => {
    try {
      const TENOR_KEY = process.env.TENOR_API_KEY || 'AIzaSyDHVvM9sTsHEGKM7u9o6VnGVXnVaH9QwQ8';
      const url = `https://tenor.googleapis.com/v2/search?q=${query}&key=${TENOR_KEY}&limit=${limit}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        return data.results.map(gif => gif.media_formats.gif.url);
      }
      return [];
    } catch (e) {
      console.error('Tenor API error:', e);
      return [];
    }
  },

  // Giphy API
  giphy: async (query, limit = 5) => {
    try {
      const GIPHY_KEY = process.env.GIPHY_API_KEY || 'dc6zaTOxFJmzC';
      const url = `https://api.giphy.com/v1/gifs/search?q=${query}&api_key=${GIPHY_KEY}&limit=${limit}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        return data.data.map(gif => gif.images.original.url);
      }
      return [];
    } catch (e) {
      console.error('Giphy API error:', e);
      return [];
    }
  },

  // Random iz oba API-ja
  random: async (query) => {
    try {
      const tenor = await GIF_API.tenor(query, 1);
      const giphy = await GIF_API.giphy(query, 1);
      
      const allGifs = [...tenor, ...giphy].filter(Boolean);
      if (allGifs.length > 0) {
        return allGifs[Math.floor(Math.random() * allGifs.length)];
      }
      return null;
    } catch (e) {
      console.error('GIF fetch error:', e);
      return null;
    }
  }
};

export default GIF_API;