import { io } from 'socket.io-client';
import { apiUrl } from './apiUrl';
import ENV_CONFIG from './envConfig';

class SocketGameAPI {
  constructor() {
    this.socket = null;
    this.gameId = null;
    this.tenantId = null; // Store tenantId for multi-bot mode
    this.moveCallbacks = new Map();
    this.isConnected = false;
    this.connectPromise = null;
  }

  // Connect to WebSocket server
  connect(token, tenantId = null) {
    if (this.socket) return;

    // Get token from localStorage if not provided
    const authToken = token || localStorage.getItem("chicknroad");
    
    // Store tenantId for multi-bot mode
    if (ENV_CONFIG.isMultiBot && tenantId) {
      this.tenantId = tenantId;
    }
    
    // Build auth payload based on mode
    const authPayload = {
      token: authToken
    };
    
    // Add tenantId to auth for multi-bot mode (backend can extract from handshake)
    if (ENV_CONFIG.isMultiBot && tenantId) {
      authPayload.tenantId = tenantId;
    }
    
    this.socket = io(apiUrl, {
      transports: ['websocket', 'polling'],
      timeout: 5000,
      auth: authPayload
    });

    this.socket.on('connect', () => {
      console.log('🔗 WebSocket connected');
      this.isConnected = true;
      if (this.connectPromise) {
        this.connectPromise.resolve();
        this.connectPromise = null;
      }
    });

    this.socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      this.isConnected = false;
    });

    this.socket.on('moveResult', (result) => {
      console.log('📥 Move result received:', result);
      
      // Callbacks are keyed by the SERVER lane index we sent
      const serverLane = typeof result.currentLane === 'number' ? result.currentLane : NaN;
      const callback = this.moveCallbacks.get(serverLane);
      if (callback) {
        callback(result);
        this.moveCallbacks.delete(serverLane);
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('🚫 WebSocket connection error:', error);
      if (this.connectPromise) {
        this.connectPromise.reject(error);
        this.connectPromise = null;
      }
    });
  }

  // Create a new game via WebSocket
  async createGame(gameData, token, tenantId = null) {
    await this.ensureConnected(token, tenantId);
    return new Promise((resolve, reject) => {
      const onResult = (result) => {
        this.socket.off('createGameResult', onResult);
        if (result?.success) {
          resolve(result);
        } else {
          reject(new Error(result?.error || 'Failed to create game'));
        }
      };

      this.socket.on('createGameResult', onResult);
      
      // Build payload - token in payload, tenantId stored in socket connection
      const payload = { ...gameData, token };
      
      // tenantId is already in auth handshake, backend can extract from socket
      // But we can also send it in payload for clarity
      if (ENV_CONFIG.isMultiBot && (tenantId || this.tenantId)) {
        payload.tenantId = tenantId || this.tenantId;
      }
      
      this.socket.emit('createGame', payload);

      setTimeout(() => {
        this.socket.off('createGameResult', onResult);
        reject(new Error('Create game timeout'));
      }, 7000);
    });
  }

  // Disconnect WebSocket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.tenantId = null;
    }
  }

  // Join a specific game room
  joinGame(gameId) {
    if (!this.socket || !gameId) return;
    
    this.gameId = gameId;
    this.socket.emit('joinGame', gameId);
    console.log(`🎮 Joined game room: ${gameId}`);
  }

  // Wait for socket connection with timeout
  async waitForConnection(timeoutMs = 3000) {
    if (this.isSocketConnected()) return;
    if (!this.connectPromise) {
      let resolveFn, rejectFn;
      const p = new Promise((resolve, reject) => {
        resolveFn = resolve;
        rejectFn = reject;
      });
      this.connectPromise = { promise: p, resolve: resolveFn, reject: rejectFn };
    }
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('WebSocket connect timeout')), timeoutMs));
    await Promise.race([this.connectPromise.promise, timeout]).catch((e) => { throw e; });
  }

  // Ensure connected (calls connect if needed) and waits
  async ensureConnected(token, tenantId = null) {
    if (!this.socket) {
      this.connect(token, tenantId);
    }
    if (!this.isSocketConnected()) {
      await this.waitForConnection();
    }
  }

  // Validate move with WebSocket (instant response)
  async validateMove(gameId, currentLane, token, tenantId = null) {
    await this.ensureConnected(token, tenantId);
    return new Promise((resolve, reject) => {

      // Translate client lane (side road = 0, first lane = 1) to server zero-based (first lane = 0)
      // Side road becomes -1 so that next = 0 on server for the first move
      const serverLane = (typeof currentLane === 'number') ? (currentLane - 1) : NaN;

      // Prevent concurrent validations for the same server lane to avoid callback overwrite
      if (this.moveCallbacks.has(serverLane)) {
        reject(new Error('Move validation already in progress for this lane'));
        return;
      }

      // Store callback for this move. Always resolve with server payload; gameplay code
      // decides based on result.canMove. Only reject on transport/timeouts.
      this.moveCallbacks.set(serverLane, (result) => {
        resolve(result);
      });

      // Build payload
      const payload = {
        gameId,
        currentLane: serverLane,
        token
      };
      
      // tenantId already in socket auth, but send for clarity
      if (ENV_CONFIG.isMultiBot && (tenantId || this.tenantId)) {
        payload.tenantId = tenantId || this.tenantId;
      }

      // Send move validation request
      this.socket.emit('validateMove', payload);

      // Timeout after 5 seconds
      setTimeout(() => {
        if (this.moveCallbacks.has(serverLane)) {
          this.moveCallbacks.delete(serverLane);
          reject(new Error('Move validation timeout'));
        }
      }, 5000);
    });
  }

  // Cash out with WebSocket (instant response)
  async cashOut(gameId, currentLane, token, tenantId = null) {
    await this.ensureConnected(token, tenantId);
    return new Promise((resolve, reject) => {

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

      // Build payload
      const payload = {
        gameId,
        // Translate to server zero-based lanes
        currentLane: (typeof currentLane === 'number') ? (currentLane - 1) : currentLane,
        token
      };
      
      // tenantId already in socket auth, but send for clarity
      if (ENV_CONFIG.isMultiBot && (tenantId || this.tenantId)) {
        payload.tenantId = tenantId || this.tenantId;
      }

      // Send cash out request
      this.socket.emit('cashOut', payload);

      // Timeout after 5 seconds
      setTimeout(() => {
        this.socket.off('cashOutResult', cashOutCallback);
        reject(new Error('Cash out timeout'));
      }, 5000);
    });
  }

  // Retry wrapper for validateMove with simple exponential backoff
  async validateMoveWithRetry(gameId, currentLane, token, tenantId = null, options = {}) {
    const {
      retries = 3,
      initialDelayMs = 300,
      backoffFactor = 2,
    } = options;

    let attempt = 0;
    let delay = initialDelayMs;
    
    while (true) {
      try {
        return await this.validateMove(gameId, currentLane, token, tenantId);
      } catch (err) {
        attempt += 1;
        if (attempt > retries) throw err;
        await new Promise((r) => setTimeout(r, Math.max(0, delay)));
        delay = Math.round(delay * backoffFactor);
      }
    }
  }

  // Retry wrapper for cashOut with exponential backoff on transport/timeouts
  async cashOutWithRetry(gameId, currentLane, token, tenantId = null, options = {}) {
    const {
      retries = 3,
      initialDelayMs = 300,
      backoffFactor = 2,
    } = options;

    let attempt = 0;
    let delay = initialDelayMs;
    
    while (true) {
      try {
        return await this.cashOut(gameId, currentLane, token, tenantId);
      } catch (err) {
        attempt += 1;
        if (attempt > retries) throw err;
        await new Promise((r) => setTimeout(r, Math.max(0, delay)));
        delay = Math.round(delay * backoffFactor);
      }
    }
  }

  // Check connection status
  isSocketConnected() {
    return this.isConnected && this.socket?.connected;
  }
}

// Create singleton instance
const socketGameAPI = new SocketGameAPI();

export default socketGameAPI;
