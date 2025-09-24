import { useCallback, useRef } from 'react'
import engine from '../traffic/TrafficEngine'
import { GAME_CONFIG } from '../utils/gameConfig'
import socketGameAPI from '../utils/socketApi'

/**
 * Custom hook for game logic operations
 * Handles core game mechanics like jumping, crashing, and validation
 */
export const useGameLogic = (gameState, audioManager) => {
  const restartGuardRef = useRef(false)

  // Physics-based jump function
  const startJump = useCallback((targetLane) => {
    if (gameState.isJumping) return
    if (gameState.isDead || gameState.gameEnded) return

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
      if (process.env.NODE_ENV !== 'production') {
        console.log('Chicken jumped through lanes:', next);
      }
      return next;
    })

    // Log completion
    if (targetLane >= gameState.allLanes.length) {
      console.log('Finished: reached final side road')
    } else if (targetLane === gameState.allLanes.length - 1) {
      console.log('Finished: jumping into final lane before side road')
    }
  }, [gameState])

  // Handle crash when server detects collision
  const handleCrash = useCallback((moveData) => {
    console.log('🔥 CRASH DETECTED by server!', moveData);

    // Stop all animations and movement
    gameState.setIsJumping(false);
    gameState.setJumpProgress(0);

    // Set death state
    gameState.setIsDead(true);
    gameState.setGameEnded(true);
    gameState.setIsGameActive(false);

    // Play crash audio
    if (audioManager.current) {
      audioManager.current.playCrash()
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
    console.log('🎮 moveToNextLane called:', {
      isDead: gameState.isDead,
      gameEnded: gameState.gameEnded,
      isGameActive: gameState.isGameActive,
      currentGameId: gameState.currentGameId,
      currentLaneIndex: gameState.currentLaneIndex,
      isValidatingNext: gameState.isValidatingNext
    });

    // Don't allow movement if chicken is dead or game has ended
    if (gameState.isDead || gameState.gameEnded) {
      console.log('Cannot move: chicken is dead or game has ended');
      return;
    }
    
    // Prevent overlapping validations/click spamming
    if (gameState.isValidatingNext || gameState.isJumping) {
      console.log('Already validating or jumping, ignoring GO');
      return;
    }

    // For first move in a new game, just start the jump animation
    if (!gameState.isGameActive || !gameState.currentGameId) {
      const nextPosition = gameState.currentLaneIndex + 1;
      console.log(`Starting local jump to position ${nextPosition} (no server validation needed for first move)`);
      startJump(nextPosition);
      return;
    }

    // For subsequent moves, validate with server
    const preIndex = gameState.currentLaneIndex;
    const nextPosition = preIndex + 1;
    
    // Allow final jump into the final sidewalk without server validation
    if (Array.isArray(gameState.allLanes) && nextPosition > gameState.allLanes.length - 1) {
      console.log('Final jump into final sidewalk');
      startJump(nextPosition);
      return;
    }
    
    const serverLaneIndex = preIndex;
    console.log(`Checking server: Can move to position ${nextPosition} (Lane ${nextPosition})?`);

    // Validate first; only animate if server allows
    gameState.setIsValidatingNext(true);

    try {
      // Use retry-capable validation
      const moveData = await socketGameAPI.validateMoveWithRetry(
        gameState.currentGameId,
        serverLaneIndex,
        token,
        { retries: 2, initialDelayMs: 300, backoffFactor: 2 }
      );
      
      console.log('🔍 WebSocket move validation:', {
        clientPosition: nextPosition,
        serverLaneIndex: serverLaneIndex,
        canMove: moveData.canMove,
        gameId: gameState.currentGameId,
        moveData
      });

      const willCrash = typeof moveData.willCrash === 'boolean' ? moveData.willCrash : !moveData.canMove;
      if (willCrash) {
        // Animate the jump to the next lane, then crash after landing
        gameState.setBlockedNextLane(false)
        gameState.setCrashVisual({ lane: nextPosition, tick: Date.now() })
        startJump(nextPosition);
        const JUMP_DURATION_MS = GAME_CONFIG.JUMP?.DURATION_MS ?? 800;
        setTimeout(() => {
          handleCrash(moveData);
        }, JUMP_DURATION_MS);
      } else {
        // Safe to jump. If the destination lane is currently blocked, we already
        // suppress future spawns. Optionally wait for any existing regular car
        // in that lane to be near the end before jumping for better visuals.
        const WAIT_ENABLED = true
        const MIN_PROGRESS_TO_JUMP = 0.8 // 80% of lane
        const MAX_WAIT_MS = Math.max(250, (GAME_CONFIG.JUMP?.MAX_WAIT_MS ?? 1200))

        if (WAIT_ENABLED && typeof engine?.getCarsForLane === 'function') {
          const laneToCheck = nextPosition
          const startWait = Date.now()
          const poll = () => {
            const cars = engine.getCarsForLane(laneToCheck) || []
            // Consider only non-showcase, non-crash cars
            const moving = cars.filter(c => !c.isBlockedShowcase && !c.isCrashLane)
            let ok = true
            for (const c of moving) {
              const progress = Math.max(0, Math.min(1, (Date.now() - c.startTime) / (c.animationDuration || 1)))
              if (progress < MIN_PROGRESS_TO_JUMP) { ok = false; break }
            }
            const waited = Date.now() - startWait
            if (ok || waited >= MAX_WAIT_MS) {
              startJump(nextPosition)
            } else {
              setTimeout(poll, 60)
            }
          }
          // brief decision delay before polling
          setTimeout(poll, 120)
        } else {
          // Fallback: short decision delay
          const DECISION_DELAY_MS = 150
          setTimeout(() => startJump(nextPosition), DECISION_DELAY_MS)
        }
      }
    } catch (wsError) {
      console.error('WebSocket validation failed (after retries):', wsError);
    } finally {
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
        console.log(`Attempting to cash out at lane ${gameState.currentLaneIndex}`);

        // Use retry-capable cash out
        const cashOutData = await socketGameAPI.cashOutWithRetry(
          gameState.currentGameId,
          gameState.currentLaneIndex,
          token,
          { retries: 2, initialDelayMs: 300, backoffFactor: 2 }
        );
        
        console.log('WebSocket cash out successful:', cashOutData);

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

        console.log(`Cashed out: ${cashOutData.winAmount} ETB at ${cashOutData.multiplier}x multiplier`);

        return cashOutData;
      } catch (error) {
        console.error('Cash out failed:', error);
        throw error;
      }
    }
  }, [gameState, audioManager]);

  // Reset game function
  const resetGame = useCallback(() => {
    console.log('Resetting game - chicken back to side road')
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