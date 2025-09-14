import { apiUrl } from './apiUrl';
import CryptoJS from 'crypto-js';

// Game API functions for Chicken Road 2
export const gameApi = {
  // Play a game
  async playGame(difficulty = 'easy', betAmount = 10, playerId = null) {
    try {
      const response = await fetch(`${apiUrl}/play`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientSeed: `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          difficulty: difficulty,
          playerId: playerId || `player_${Date.now()}`,
          betAmount: betAmount
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error playing game:', error);
      throw error;
    }
  },

  // Get difficulty configurations
  async getDifficulties() {
    try {
      const response = await fetch(`${apiUrl}/difficulties`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting difficulties:', error);
      throw error;
    }
  },

  // Get player statistics
  async getPlayerStats(playerId) {
    try {
      const response = await fetch(`${apiUrl}/player/${playerId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting player stats:', error);
      throw error;
    }
  }
};

// Helper function to generate client seed
export const generateClientSeed = () => {
  return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Helper function to verify game result (provably fair)
export const verifyGameResult = (clientSeed, nonce, serverSeed, providedHash) => {
  const message = clientSeed + nonce;
  const hash = CryptoJS.HmacSHA256(message, serverSeed).toString();
  return hash === providedHash;
};
