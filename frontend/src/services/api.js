import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const gameAPI = {
  // Get available themes
  getThemes: async () => {
    const response = await api.get('/game/themes');
    return response.data;
  },

  // Start a new game
  startGame: async (theme, characterName) => {
    const response = await api.post('/game/start', { theme, characterName });
    return response.data;
  },

  // Send player action
  sendAction: async (sessionId, action) => {
    const response = await api.post('/game/action', { sessionId, action });
    return response.data;
  },

  // Get game state
  getGameState: async (sessionId) => {
    const response = await api.get(`/game/state/${sessionId}`);
    return response.data;
  },
};

export default api;
