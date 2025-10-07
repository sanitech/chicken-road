import { useCallback, useRef } from 'react'
import engine from '../traffic/TrafficEngine'
import { GAME_CONFIG } from '../utils/gameConfig'
import socketGameAPI from '../utils/socketApi'

/**
 * Custom hook for game logic operations
 * Handles core game mechanics like jumping, crashing, and validation
 */
export const useGameLogic = (gameState, audioManager, tenantId = null) => {
  const restartGuardRef = useRef(false)

  // Physics-based jump function
  const startJump = useCallback((targetLane) => {
    if (gameState.isJumping) return
    if (gameState.isDead || gameState.gameEnded || gameState.isRestarting) return

    // Play jump audio
    if (audioManager.current) {
      audioManager.current.playJump()
    }

    gameState.setIsJumping(true)
    gameState.setJumpStartLane(gameState.currentLaneIndex)
    gameState.setJumpTargetLane(targetLane)
    gameState.setJumpProgress(0)

    // Animate the jump
    const jumpDuration = GAME_CONFIG.JUMP?.DURATION_MS ?? 800
    const startTime = Date.now()

    const animateJump = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / jumpDuration, 1)

      // Apply physics-based easing
      const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      const easedProgress = easeInOutCubic(progress)

      gameState.setJumpProgress(easedProgress)

      if (progress < 1) {
        requestAnimationFrame(animateJump)
      } else {
        completeJump(targetLane)
      }
    }

    requestAnimationFrame(animateJump)
  }, [gameState, audioManager])

  // Complete the jump and update state
  const completeJump = useCallback((targetLane) => {
    gameState.setCurrentLaneIndex(targetLane)
    gameState.setJumpProgress(0)
    gameState.setIsJumping(false)

    // Update moved lanes
    gameState.setMovedLanes(prev => {
      if (prev[prev.length - 1] === targetLane) return prev;
      const next = [...prev, targetLane];
      
      return next;
    })

    // Log completion
    
  }, [gameState])

  // Handle crash when server detects collision
  const handleCrash = useCallback((moveData) => {
    

    // Stop all animations and movement
    gameState.setIsJumping(false);
    gameState.setJumpProgress(0);

    // Set death state
    gameState.setIsDead(true);
    gameState.setGameEnded(true);
    gameState.setIsGameActive(false);

    // Play chicken-over audio (distinct from car crash/blocker stop)
    if (audioManager.current) {
      audioManager.current.playChickenOver()
    }

    // Clear game data
    gameState.setCurrentGameId(null);

    // Force auto-restart after crash
    if (!restartGuardRef.current) {
      restartGuardRef.current = true;
      const delay = (GAME_CONFIG.RESTART?.DELAY_MS ?? 1200);
      setTimeout(() => {
        resetGame();
        restartGuardRef.current = false;
      }, Math.max(0, delay));
    }
  }, [gameState, audioManager])

  // Move to next lane with server validation
  const moveToNextLane = useCallback(async (token) => {
    

    // Don't allow movement if chicken is dead or game has ended
    if (gameState.isDead || gameState.gameEnded || gameState.isRestarting) {
      
      return;
    }
    
    // Prevent overlapping validations/click spamming
    if (gameState.isValidatingNext || gameState.isJumping) {
      
      return;
    }

    // For first move in a new game, apply same clean waiting logic
    if (!gameState.isGameActive || !gameState.currentGameId) {
      const nextPosition = gameState.currentLaneIndex + 1;
      
      
      // Set validating state to keep buttons at 90% opacity
      gameState.setIsValidatingNext(true)
      
      // Lane.jsx effect will block the lane automatically when isValidatingNext becomes true
      // Wait for lane to be empty before jumping (same logic as other lanes)
      const POLL_INTERVAL = GAME_CONFIG.JUMP_VALIDATION?.POLL_INTERVAL_MS ?? 100
      
      const waitForLaneEmpty = () => {
        if (typeof engine?.getCarsForLane !== 'function') {
          gameState.setIsValidatingNext(false)
          startJump(nextPosition)
          return
        }
        
        const cars = engine.getCarsForLane(nextPosition) || []
        const realCars = cars.filter(c => !c.done && !c.isBlockedShowcase && !c.isCrashLane)
        
        if (realCars.length === 0) {
          
          gameState.setIsValidatingNext(false)
          startJump(nextPosition)
        } else {
          const car = realCars[0]
          
          // Calculate car progress to decide if we should boost
          const now = Date.now()
          const elapsed = now - car.startTime
          const duration = car.animationDuration || 2000
          const progress = Math.min(1, elapsed / duration)
          
          // BOOST LOGIC: Only boost slow cars, skip if already close to exit
          const MIN_PROGRESS_TO_SKIP_BOOST = GAME_CONFIG.JUMP_VALIDATION?.MIN_PROGRESS_TO_SKIP_BOOST ?? 0.65
          if (progress < MIN_PROGRESS_TO_SKIP_BOOST && !car.shouldAccelerateOut && typeof engine?.boostCarSpeed === 'function') {
            
            engine.boostCarSpeed(nextPosition, car.id)
          } else if (progress >= MIN_PROGRESS_TO_SKIP_BOOST) {
            
          }
          
          // Keep polling - the car will complete and be removed from lane
          setTimeout(() => waitForLaneEmpty(), POLL_INTERVAL)
        }
      }
      
      waitForLaneEmpty()
      return;
    }

    // For subsequent moves, validate with server
    const preIndex = gameState.currentLaneIndex;
    const nextPosition = preIndex + 1;
    
    // Allow final jump into the final sidewalk without server validation
    if (Array.isArray(gameState.allLanes) && nextPosition > gameState.allLanes.length - 1) {
      
      startJump(nextPosition);
      return;
    }
    
    const serverLaneIndex = preIndex;
    

    // Validate first; only animate if server allows
    gameState.setIsValidatingNext(true);

    try {
      // Use retry-capable validation
      const moveData = await socketGameAPI.validateMoveWithRetry(
        gameState.currentGameId,
        serverLaneIndex,
        token,
        tenantId, // Pass tenantId
        { retries: 2, initialDelayMs: 300, backoffFactor: 2 }
      );
      
      

      const willCrash = typeof moveData.willCrash === 'boolean' ? moveData.willCrash : !moveData.canMove;
      const destinationLane = nextPosition
      
      // SIMPLE CLEAN APPROACH:
      // 1. Block lane IMMEDIATELY - no new spawns
      // 2. Wait for ANY visible cars to finish NATURALLY (no clearing!)
      // 3. Jump only when lane is 100% empty
      
      
      // Lane.jsx effect will block the lane automatically when isValidatingNext becomes true
      
      // Recursive function: check if lane is empty, if not wait
      const POLL_INTERVAL = GAME_CONFIG.JUMP_VALIDATION?.POLL_INTERVAL_MS ?? 100
      
      const waitForLaneEmpty = () => {
        if (typeof engine?.getCarsForLane !== 'function') {
          performJump(willCrash)
          return
        }
        
        const cars = engine.getCarsForLane(destinationLane) || []
        // Only check for REAL cars (not blockers or crash cars)
        const realCars = cars.filter(c => !c.done && !c.isBlockedShowcase && !c.isCrashLane)
        
        if (realCars.length === 0) {
          // Lane is completely empty - safe to jump!
          
          performJump(willCrash)
        } else {
          if (willCrash) {
            // CRASH LANE: Boost car to exit quickly, then wait for complete exit before crash car spawns
            const car = realCars[0]
            
            // Calculate car progress to decide if we should boost
            const now = Date.now()
            const elapsed = now - car.startTime
            const duration = car.animationDuration || 2000
            const progress = Math.min(1, elapsed / duration)
            
            // BOOST LOGIC: Only boost slow cars, skip if already close to exit
            const MIN_PROGRESS_TO_SKIP_BOOST = GAME_CONFIG.JUMP_VALIDATION?.MIN_PROGRESS_TO_SKIP_BOOST ?? 0.65
            if (progress < MIN_PROGRESS_TO_SKIP_BOOST && !car.shouldAccelerateOut && typeof engine?.boostCarSpeed === 'function') {
              
              engine.boostCarSpeed(destinationLane, car.id)
            } else if (progress >= MIN_PROGRESS_TO_SKIP_BOOST) {
              
            }
            
            // Keep polling until lane is empty
            setTimeout(() => waitForLaneEmpty(), POLL_INTERVAL)
          } else {
            // SAFE LANE: Boost car to exit quickly if needed
            const car = realCars[0]
            
            // Calculate car progress to decide if we should boost
            const now = Date.now()
            const elapsed = now - car.startTime
            const duration = car.animationDuration || 2000
            const progress = Math.min(1, elapsed / duration)
            
            // BOOST LOGIC: Only boost slow cars, skip if already close to exit
            const MIN_PROGRESS_TO_SKIP_BOOST = GAME_CONFIG.JUMP_VALIDATION?.MIN_PROGRESS_TO_SKIP_BOOST ?? 0.65
            if (progress < MIN_PROGRESS_TO_SKIP_BOOST && !car.shouldAccelerateOut && typeof engine?.boostCarSpeed === 'function') {
              
              engine.boostCarSpeed(destinationLane, car.id)
            } else if (progress >= MIN_PROGRESS_TO_SKIP_BOOST) {
              
            }
            
            // Keep polling - the car will complete and be removed from lane
            setTimeout(() => waitForLaneEmpty(), POLL_INTERVAL)
          }
        }
      }
      
      const performJump = (willCrash) => {
        // Clear validation state BEFORE jumping (buttons will stay disabled via isJumping)
        gameState.setIsValidatingNext(false)
        
        if (willCrash) {
          // Crash lane: jump chicken, then crash car follows
          
          gameState.setBlockedNextLane(false)
          gameState.setCrashVisual({ lane: destinationLane, tick: Date.now() })
          startJump(destinationLane)
          
          // Wait for jump to complete AND crash car to reach chicken before showing dead sprite
          const IMPACT_DELAY_MS = GAME_CONFIG.CRASH?.IMPACT_DELAY_MS ?? 800
          setTimeout(() => {
            handleCrash(moveData)
          }, IMPACT_DELAY_MS)
        } else {
          // Safe lane: just jump
          
          startJump(destinationLane)
        }
      }
      
      // Start waiting for lane to be empty
      waitForLaneEmpty()
    } catch (wsError) {
      
      gameState.setIsValidatingNext(false);
    }
  }, [gameState, startJump, handleCrash]);

  // Cash out functionality
  const handleCashOut = useCallback(async (token) => {
    if (gameState.currentLaneIndex > 0 && !gameState.isDead && !gameState.gameEnded && gameState.isGameActive && gameState.currentGameId) {
      // Play button click audio
      if (audioManager.current) {
        audioManager.current.playButtonClick()
      }

      try {
        

        // Use retry-capable cash out
        const cashOutData = await socketGameAPI.cashOutWithRetry(
          gameState.currentGameId,
          gameState.currentLaneIndex,
          token,
          tenantId, // Pass tenantId
          { retries: 2, initialDelayMs: 300, backoffFactor: 2 }
        );
        
        

        // Play cashout audio
        if (audioManager.current) {
          audioManager.current.playCashout()
        }

        // Store cash out amount for animation
        gameState.setLastCashOutAmount(cashOutData.winAmount);
        gameState.setShowCashOutAnimation(true);

        // Hide animation after 3 seconds
        setTimeout(() => {
          gameState.setShowCashOutAnimation(false);
        }, 3000);

        // Reset game state
        gameState.setIsGameActive(false);
        gameState.setCurrentGameId(null);
        gameState.setServerMultiplier(null);

        // Reset game after cash out
        setTimeout(() => {
          resetGame();
        }, 1500);

        

        return cashOutData;
      } catch (error) {
        
        throw error;
      }
    }
  }, [gameState, audioManager]);

  // Reset game function
  const resetGame = useCallback(() => {
    
    gameState.resetGameState()
  }, [gameState]);

  return {
    startJump,
    completeJump,
    handleCrash,
    moveToNextLane,
    handleCashOut,
    resetGame
  }
}