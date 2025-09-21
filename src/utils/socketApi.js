import { io } from 'socket.io-client';
import { apiUrl } from './apiUrl';

class SocketGameAPI {
  constructor() {
    this.socket = null;
    this.gameId = null;
    this.moveCallbacks = new Map();
    this.isConnected = false;
  }

  // Connect to WebSocket server
  connect() {
    if (this.socket) return;

    this.socket = io(apiUrl, {
      transports: ['websocket', 'polling'],
      timeout: 5000,
    });

    this.socket.on('connect', () => {
      console.log('🔗 WebSocket connected');
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      this.isConnected = false;
    });

    this.socket.on('moveResult', (result) => {
      console.log('📥 Move result received:', result);
      
      // Find and call the appropriate callback
      const callback = this.moveCallbacks.get(result.currentLane);
      if (callback) {
        callback(result);
        this.moveCallbacks.delete(result.currentLane);
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('🚫 WebSocket connection error:', error);
    });
  }

  // Disconnect WebSocket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Join a specific game room
  joinGame(gameId) {
    if (!this.socket || !gameId) return;
    
    this.gameId = gameId;
    this.socket.emit('joinGame', gameId);
    console.log(`🎮 Joined game room: ${gameId}`);
  }

  // Validate move with WebSocket (instant response)
  async validateMove(gameId, currentLane, token) {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      // Prevent concurrent validations for the same lane to avoid callback overwrite
      if (this.moveCallbacks.has(currentLane)) {
        reject(new Error('Move validation already in progress for this lane'));
        return;
      }

      // Store callback for this move. Always resolve with server payload; gameplay code
      // decides based on result.canMove. Only reject on transport/timeouts.
      this.moveCallbacks.set(currentLane, (result) => {
        resolve(result);
      });

      // Send move validation request with token
      this.socket.emit('validateMove', {
        gameId,
        currentLane,
        token
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        if (this.moveCallbacks.has(currentLane)) {
          this.moveCallbacks.delete(currentLane);
          reject(new Error('Move validation timeout'));
        }
      }, 5000);
    });
  }

  // Cash out with WebSocket (instant response)
  async cashOut(gameId, currentLane, token) {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      // Store callback for cash out
      const cashOutCallback = (result) => {
        if (result.success) {
          resolve(result);
        } else {
          reject(new Error(result.error || 'Cash out failed'));
        }
      };

      // Listen for cash out result
      this.socket.once('cashOutResult', cashOutCallback);

      // Send cash out request with token
      this.socket.emit('cashOut', {
        gameId,
        currentLane,
        token
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        this.socket.off('cashOutResult', cashOutCallback);
        reject(new Error('Cash out timeout'));
      }, 5000);
    });
  }

  // Check connection status
  isSocketConnected() {
    return this.isConnected && this.socket?.connected;
  }
}

// Create singleton instance
const socketGameAPI = new SocketGameAPI();

export default socketGameAPI;
