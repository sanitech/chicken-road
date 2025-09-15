import { apiUrl } from './apiUrl';
import CryptoJS from 'crypto-js';

// Game API functions for Chicken Road 2
export const gameApi = {
  // Create a new game
  async createGame({ difficulty = 'easy', betAmount = 10, creatorChatId = 'guest' }) {
    try {
      const response = await fetch(`${apiUrl}/api/games/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('chicknroad')}`
        },
        body: JSON.stringify({
          clientSeed: `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          difficulty,
          betAmount: betAmount,
          creatorChatId
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating game:', error);
      throw error;
    }
  },

  // Check if can move to the next lane
  async canMove(gameId, currentLane) {
    try {
      const url = new URL(`${apiUrl}/api/games/canMove`);
      url.searchParams.set('gameId', gameId);
      url.searchParams.set('currentLane', String(currentLane));
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chicknroad')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error checking canMove:', error);
      throw error;
    }
  },

  // Cash out from current lane
  async cashOut(gameId, currentLane) {
    try {
      const response = await fetch(`${apiUrl}/api/games/cashOut`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',  
          'Authorization': `Bearer ${localStorage.getItem('chicknroad')}`
        },
        body: JSON.stringify({
          gameId,
          currentLane
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error cashing out:', error);
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
