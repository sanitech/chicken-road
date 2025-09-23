import { useState, useEffect, useCallback, useRef } from 'react'
import socketGameAPI from '../utils/socketApi'

/**
 * Custom hook for WebSocket connection health monitoring
 * Tracks connection status, latency, and provides reconnection logic
 */
export const useConnectionHealth = () => {
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [latency, setLatency] = useState(0)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const [lastError, setLastError] = useState(null)
  
  const pingIntervalRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const maxReconnectAttempts = 5
  const reconnectDelay = 2000 // 2 seconds

  // Ping the server to check connection health
  const pingServer = useCallback(() => {
    if (!socketGameAPI.isSocketConnected()) {
      setConnectionStatus('disconnected')
      return
    }

    const start = Date.now()
    // Emit a ping event and measure response time
    socketGameAPI.socket.emit('ping', () => {
      const responseTime = Date.now() - start
      setLatency(responseTime)
      setConnectionStatus('connected')
      setLastError(null)
    })
  }, [])

  // Start connection monitoring
  const startMonitoring = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
    }

    pingIntervalRef.current = setInterval(() => {
      pingServer()
    }, 5000) // Ping every 5 seconds
  }, [pingServer])

  // Stop connection monitoring
  const stopMonitoring = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = null
    }
  }, [])

  // Attempt to reconnect
  const attemptReconnect = useCallback(async (token) => {
    if (reconnectAttempts >= maxReconnectAttempts) {
      setConnectionStatus('failed')
      setLastError('Maximum reconnection attempts reached')
      return false
    }

    setConnectionStatus('reconnecting')
    setReconnectAttempts(prev => prev + 1)

    try {
      // Disconnect existing connection
      socketGameAPI.disconnect()
      
      // Wait a bit before reconnecting
      await new Promise(resolve => setTimeout(resolve, reconnectDelay))
      
      // Attempt to reconnect
      socketGameAPI.connect(token)
      
      // Wait for connection to establish
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Reconnection timeout')), 10000)
        
        const checkConnection = () => {
          if (socketGameAPI.isSocketConnected()) {
            clearTimeout(timeout)
            resolve()
          } else {
            setTimeout(checkConnection, 100)
          }
        }
        
        checkConnection()
      })

      setConnectionStatus('connected')
      setReconnectAttempts(0)
      setLastError(null)
      return true
    } catch (error) {
      console.error('Reconnection failed:', error)
      setLastError(error.message)
      
      // Schedule next reconnection attempt
      reconnectTimeoutRef.current = setTimeout(() => {
        attemptReconnect(token)
      }, reconnectDelay * Math.pow(2, reconnectAttempts)) // Exponential backoff
      
      return false
    }
  }, [reconnectAttempts, maxReconnectAttempts, reconnectDelay])

  // Get connection quality indicator
  const getConnectionQuality = useCallback(() => {
    if (connectionStatus !== 'connected') return 'poor'
    if (latency < 100) return 'excellent'
    if (latency < 300) return 'good'
    if (latency < 500) return 'fair'
    return 'poor'
  }, [connectionStatus, latency])

  // Check if connection is healthy
  const isHealthy = useCallback(() => {
    return connectionStatus === 'connected' && latency < 1000
  }, [connectionStatus, latency])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring()
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [stopMonitoring])

  return {
    connectionStatus,
    latency,
    reconnectAttempts,
    lastError,
    startMonitoring,
    stopMonitoring,
    attemptReconnect,
    getConnectionQuality,
    isHealthy,
    pingServer
  }
}