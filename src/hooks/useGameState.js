import { useState, useCallback } from 'react'

/**
 * Custom hook for core game state management
 * Focuses on the essential game state without over-engineering
 */
export const useGameState = () => {
  // Core game state
  const [currentLaneIndex, setCurrentLaneIndex] = useState(0)
  const [movedLanes, setMovedLanes] = useState([0])
  const [allLanes, setAllLanes] = useState([])
  
  // Jump animation state
  const [isJumping, setIsJumping] = useState(false)
  const [jumpProgress, setJumpProgress] = useState(0)
  const [jumpStartLane, setJumpStartLane] = useState(0)
  const [jumpTargetLane, setJumpTargetLane] = useState(0)
  const [autoFinalJumped, setAutoFinalJumped] = useState(false)
  
  // Game status
  const [gameEnded, setGameEnded] = useState(false)
  const [isDead, setIsDead] = useState(false)
  const [isGameActive, setIsGameActive] = useState(false)
  const [isRestarting, setIsRestarting] = useState(false)
  
  // Server state
  const [currentGameId, setCurrentGameId] = useState(null)
  const [serverMultiplier, setServerMultiplier] = useState(null)
  const [blockedNextLane, setBlockedNextLane] = useState(false)
  const [isValidatingNext, setIsValidatingNext] = useState(false)
  
  // Visual effects
  const [crashVisual, setCrashVisual] = useState({ lane: -1, tick: 0 })
  const [resetKey, setResetKey] = useState(0)
  
  // Cash out state
  const [showCashOutAnimation, setShowCashOutAnimation] = useState(false)
  const [lastCashOutAmount, setLastCashOutAmount] = useState(0)

  // Reset game state
  const resetGameState = useCallback(() => {
    setCurrentLaneIndex(0)
    setMovedLanes([0])
    setGameEnded(false)
    setIsDead(false)
    setIsJumping(false)
    setJumpProgress(0)
    setIsRestarting(false)
    setAutoFinalJumped(false)
    setIsGameActive(false)
    setCurrentGameId(null)
    setServerMultiplier(null)
    setBlockedNextLane(false)
    setCrashVisual({ lane: -1, tick: 0 })
    setResetKey(prev => prev + 1)
    setShowCashOutAnimation(false)
    setLastCashOutAmount(0)
  }, [])

  return {
    // State
    currentLaneIndex,
    movedLanes,
    allLanes,
    isJumping,
    jumpProgress,
    jumpStartLane,
    jumpTargetLane,
    autoFinalJumped,
    gameEnded,
    isDead,
    isGameActive,
    isRestarting,
    currentGameId,
    serverMultiplier,
    blockedNextLane,
    isValidatingNext,
    crashVisual,
    resetKey,
    showCashOutAnimation,
    lastCashOutAmount,
    
    // Setters
    setCurrentLaneIndex,
    setMovedLanes,
    setAllLanes,
    setIsJumping,
    setJumpProgress,
    setJumpStartLane,
    setJumpTargetLane,
    setAutoFinalJumped,
    setGameEnded,
    setIsDead,
    setIsGameActive,
    setIsRestarting,
    setCurrentGameId,
    setServerMultiplier,
    setBlockedNextLane,
    setIsValidatingNext,
    setCrashVisual,
    setResetKey,
    setShowCashOutAnimation,
    setLastCashOutAmount,
    
    // Helpers
    resetGameState
  }
}