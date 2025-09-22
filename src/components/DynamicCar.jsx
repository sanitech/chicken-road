import React, { useState, useEffect, useRef, memo } from 'react'
import { GAME_CONFIG } from '../utils/gameConfig'
import Car from './Car'

// Smart Car Component with chicken collision detection and pause system
function DynamicCar({ carData, hasBlocker, onAnimationComplete, cutoff = 0.6, onBlockedStop }) {
  const [carState, setCarState] = useState('waiting') // waiting -> moving -> paused -> stopped -> gone
  const wrapperRef = useRef(null)
  // Control wrapper Y position via state so React doesn't overwrite it on re-render
  const spawnOffset = -(GAME_CONFIG.CAR.SPAWN_TOP_OFFSET_PX || 0)
  const [currentTopPx, setCurrentTopPx] = useState(spawnOffset)
  const removeTimerRef = useRef(null)
  const notifiedBlockedRef = useRef(false)
  const rafRef = useRef(null)

  // Initialize when a NEW car mounts (by id)
  useEffect(() => {
    setCarState('moving')
    setCurrentTopPx(spawnOffset)
    // reset one-shot flags
    notifiedBlockedRef.current = false
  }, [carData.id])

  // Handle blocker deceleration without resetting position on non-id changes
  useEffect(() => {
    if (hasBlocker) {
      const el = wrapperRef.current
      if (!el) return
      // Find the lane column (absolute parent) to compute heights
      const laneEl = el.parentElement
      if (!laneEl) return
      const laneHeight = laneEl.clientHeight

      // Target: STOP_TOP_PERCENT of the lane height (e.g., 20%)
      const stopTopPercent = GAME_CONFIG.CAR?.STOP_TOP_PERCENT ?? 20
      const targetTop = (laneHeight * (stopTopPercent / 100)) - (GAME_CONFIG.CAR.SIZE_PX * 0.5)

      // Starting top from state (persisted across renders)
      const startTop = currentTopPx

      const duration = Math.min(900, Math.max(400, carData.animationDuration * 0.4))
      const startTime = performance.now()

      const easeOutCubic = t => 1 - Math.pow(1 - t, 3)

      const step = (now) => {
        const t = Math.min(1, (now - startTime) / duration)
        const eased = easeOutCubic(t)
        const y = startTop + (targetTop - startTop) * eased
        setCurrentTopPx(y)
        if (t < 1) {
          rafRef.current = requestAnimationFrame(step)
        } else {
          // Reached stop point under blocker
          setCarState('paused')
          // Notify parent (audio/UI) once
          if (!notifiedBlockedRef.current) {
            notifiedBlockedRef.current = true
            try { if (typeof onBlockedStop === 'function') onBlockedStop(carData) } catch {}
          }

          // If not reservation-controlled, optionally remove after some time
          // Paused cars remain until finished; do not auto-remove here.
        }
      }
      rafRef.current = requestAnimationFrame(step)
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      if (removeTimerRef.current) {
        clearTimeout(removeTimerRef.current)
        removeTimerRef.current = null
      }
    }
  }, [hasBlocker, carData.animationDuration, currentTopPx])

  // No reservation-based resume; server controls flow

  if (carState === 'waiting' || carState === 'gone') return null

  return (
    <div
      ref={wrapperRef}
      className="absolute left-1/2"
      style={{
        // Use state-controlled top so it persists across re-renders
        top: `${currentTopPx}px`,
        transform: 'translateX(-50%)',
        // Dynamic animation speed based on car data
        '--car-animation-duration': `${carData.animationDuration}ms`,
        // Ensure cars render above cap/blocker (z-2/3) but below chicken (z-10)
        zIndex: 5
      }}
    >
      <Car
        isAnimating={!hasBlocker && carState === 'moving'}
        isContinuous={false} // Single-run so cars finish naturally and are not swapped mid-way
        onAnimationComplete={onAnimationComplete} // Bubble completion to parent to mark car as done
        customSpeed={carData.animationDuration}
        isBlocked={carState === 'paused'}
        isPaused={carState === 'paused'}
        spriteSrc={carData.spriteSrc}
      />
    </div>
  )
}

export default memo(DynamicCar)
