import React, { useState, useEffect, useRef, memo } from 'react'
import { GAME_CONFIG } from '../utils/gameConfig'
import Car from './Car'

// Car component: animates once; pauses under blockers; no client-side collision
function DynamicCar({ carData, hasBlocker, onAnimationComplete, onBlockedStop }) {
  const [carState, setCarState] = useState('waiting') // waiting -> moving -> paused -> stopped -> gone
  const wrapperRef = useRef(null)
  // Control wrapper Y position via ref-backed style for smooth RAF without React re-renders
  const spawnOffset = -(GAME_CONFIG.CAR.SPAWN_TOP_OFFSET_PX || 0)
  const currentTopRef = useRef(spawnOffset)
  const notifiedBlockedRef = useRef(false)
  const rafRef = useRef(null)

  // Helper: accelerate car out of the lane quickly from its current top
  const accelerateOut = () => {
    const el = wrapperRef.current
    if (!el) return
    const laneEl = el.parentElement
    if (!laneEl) return
    const laneHeight = laneEl.clientHeight
    const startTop = currentTopRef.current
    const endTop = laneHeight + (GAME_CONFIG.CAR.SIZE_PX || 100)
    const duration = 350
    const startTime = performance.now()
    const easeIn = t => t * t
    const step = (now) => {
      const t = Math.min(1, (now - startTime) / duration)
      const eased = easeIn(t)
      const y = startTop + (endTop - startTop) * eased
      currentTopRef.current = y
      if (wrapperRef.current) wrapperRef.current.style.top = `${y}px`
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        setCarState('gone')
        try { if (typeof onAnimationComplete === 'function') onAnimationComplete() } catch {}
      }
    }
    rafRef.current = requestAnimationFrame(step)
  }

  // Initialize when a NEW car mounts (by id)
  useEffect(() => {
    setCarState('moving')
    currentTopRef.current = spawnOffset
    if (wrapperRef.current) {
      wrapperRef.current.style.top = `${spawnOffset}px`
    }
    // reset one-shot flags
    notifiedBlockedRef.current = false
  }, [carData.id])

  // Handle blocker deceleration without resetting position on non-id changes
  useEffect(() => {
    if (hasBlocker && carState !== 'gone') {
      const el = wrapperRef.current
      if (!el) return
      // Find the lane column (absolute parent) to compute heights
      const laneEl = el.parentElement
      if (!laneEl) return
      const laneHeight = laneEl.clientHeight

      // Target: STOP_TOP_PERCENT of the lane height (e.g., 20%)
      const stopTopPercent = GAME_CONFIG.CAR?.STOP_TOP_PERCENT ?? 20
      const targetTop = (laneHeight * (stopTopPercent / 100)) - (GAME_CONFIG.CAR.SIZE_PX * 0.5)

      // If we've already passed the stop point, accelerate out instead of snapping back
      if (currentTopRef.current >= targetTop) {
        // Already past blocker—leave quickly and mark as gone
        setCarState('gone')
        accelerateOut()
        return
      }

      // Starting top from ref (persisted across renders)
      const startTop = currentTopRef.current

      const duration = Math.min(900, Math.max(400, carData.animationDuration * 0.4))
      const startTime = performance.now()

      const easeOutCubic = t => 1 - Math.pow(1 - t, 3)

      // Trigger blocked sound/feedback at the BEGINNING of deceleration (more realistic)
      if (!notifiedBlockedRef.current) {
        notifiedBlockedRef.current = true
        try { if (typeof onBlockedStop === 'function') onBlockedStop({ ...carData, phase: 'decel-start' }) } catch {}
      }

      const step = (now) => {
        const t = Math.min(1, (now - startTime) / duration)
        const eased = easeOutCubic(t)
        const y = startTop + (targetTop - startTop) * eased
        currentTopRef.current = y
        if (wrapperRef.current) {
          wrapperRef.current.style.top = `${y}px`
        }
        if (t < 1) {
          rafRef.current = requestAnimationFrame(step)
        } else {
          // Reached stop point under blocker
          setCarState('paused')
          // Optional: a separate event for reaching full stop
          // try { if (typeof onBlockedStop === 'function') onBlockedStop({ ...carData, phase: 'stop' }) } catch {}

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
    }
  }, [hasBlocker, carData.animationDuration])

  // When blocker clears while paused, prefer accelerating out to avoid blocking chicken
  useEffect(() => {
    if (!hasBlocker && carState === 'paused') {
      accelerateOut()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasBlocker])

  if (carState === 'waiting' || carState === 'gone') return null

  return (
    <div
      ref={wrapperRef}
      className="absolute left-1/2"
      style={{
        top: `${currentTopRef.current}px`,
        transform: 'translateX(-50%)',
        '--car-animation-duration': `${carData.animationDuration}ms`,
        zIndex: carData.isCrashLane ? 15 : 5
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
