import { apiUrl, buildHeaders } from './apiUrl';

export const gameApi = {
  /**
   * Create a new chicken game
   * @param {Object} gameData - Game creation data
   * @param {string} gameData.clientSeed - Client-provided random seed
   * @param {string} gameData.difficulty - Game difficulty (easy, medium, hard, extreme)
   * @param {number} gameData.betAmount - Bet amount in birr
   * @param {string} gameData.creatorChatId - Player's chat ID
   * @param {string} token - JWT authentication token
   * @param {string} tenantId - Tenant ID (only for multi-bot mode)
   * @returns {Promise<Object>} Game creation response
   */
  createGame: async (gameData, token, tenantId = null) => {
    try {
      console.log("Creating game with data:", gameData);
      
      const response = await fetch(`${apiUrl}/api/games/chicken/create`, {
        method: 'POST',
        headers: buildHeaders(token, tenantId), // Use header helper with tenantId
        body: JSON.stringify(gameData)
      });

      const data = await response.json();
      console.log("Create game response:", data);

      if (!response.ok) {
        throw new Error(data.error || data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error("Error creating game:", error);
      throw error;
    }
  },

  /**
   * Check if player can move to next lane
   * @param {string} gameId - Game ID
   * @param {number} currentLane - Current lane index
   * @param {string} token - JWT authentication token
   * @param {string} tenantId - Tenant ID (only for multi-bot mode)
   * @returns {Promise<Object>} Can move response
   */
  canMove: async (gameId, currentLane, token, tenantId = null) => {
    try {
      console.log("Checking can move:", { gameId, currentLane });

      // Use query parameters for GET request (fixed backend to use req.query)
      const queryParams = new URLSearchParams({
        gameId: gameId,
        currentLane: currentLane.toString()
      });

      const response = await fetch(`${apiUrl}/api/games/chicken/canMove?${queryParams}`, {
        method: 'GET',
        headers: buildHeaders(token, tenantId) // Use header helper with tenantId
      });

      const data = await response.json();
      console.log("Can move response:", data);

      if (!response.ok) {
        throw new Error(data.error || data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error("Error checking can move:", error);
      throw error;
    }
  },

  /**
   * Cash out from current game
   * @param {string} gameId - Game ID
   * @param {number} currentLane - Current lane to cash out from
   * @param {string} token - JWT authentication token
   * @param {string} tenantId - Tenant ID (only for multi-bot mode)
   * @returns {Promise<Object>} Cash out response
   */
  cashOut: async (gameId, currentLane, token, tenantId = null) => {
    try {
      console.log("Cashing out:", { gameId, currentLane });

      const response = await fetch(`${apiUrl}/api/games/chicken/cashOut`, {
        method: 'POST', 
        headers: buildHeaders(token, tenantId), // Use header helper with tenantId
        body: JSON.stringify({ gameId, currentLane })
      });

      const data = await response.json();
      console.log("Cash out response:", data);

      if (!response.ok) {
        throw new Error(data.error || data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error("Error cashing out:", error);
      throw error;
    }
  },

  /**
   * Generate a random client seed for provably fair gaming
   * @returns {string} Random client seed
   */
  generateClientSeed: () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
};

export default gameApi;
