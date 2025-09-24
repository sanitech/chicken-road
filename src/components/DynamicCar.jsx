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
    // Read the CURRENT on-screen top so we don't jump from spawn
    let startTop = currentTopRef.current
    try {
      const cs = window.getComputedStyle(el)
      const parsed = parseFloat(cs.top)
      if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
        startTop = parsed
        currentTopRef.current = parsed
      }
    } catch {}
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

  // Moving cars: ignore blocker and keep their native movement (no accelerate-out)
  // (No-op effect retained for cleanup symmetry)
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [hasBlocker])

  // Removed safety-cull: regular cars no longer spawn while a lane is blocked

  // (Legacy paused-cleared handler removed)

  // Blocked showcase cars: small deceleration to STOP_TOP_PERCENT, then pause
  useEffect(() => {
    if (carData.isBlockedShowcase && carState === 'moving') {
      const el = wrapperRef.current
      if (!el) return
      const laneEl = el.parentElement
      if (!laneEl) return
      const laneHeight = laneEl.clientHeight
      const stopTopPercent = GAME_CONFIG.CAR?.STOP_TOP_PERCENT ?? 35
      // Compute target stop position and clamp within lane bounds
      const rawTarget = (laneHeight * (stopTopPercent / 100)) - (GAME_CONFIG.CAR.SIZE_PX * 0.5)
      const minTop = 0 - (GAME_CONFIG.CAR.SIZE_PX * 0.5)
      const maxTop = laneHeight - (GAME_CONFIG.CAR.SIZE_PX * 0.5)
      const targetTop = Math.max(minTop, Math.min(maxTop, rawTarget))
      // Small deceleration animation (quick but noticeable)
      const startTop = currentTopRef.current
      const configured = GAME_CONFIG.TRAFFIC?.BLOCKED_SHOWCASE?.DECEL_DURATION_MS ?? 700
      const duration = Math.min(600, Math.max(250, configured))
      const startTime = performance.now()
      const easeOutCubic = t => 1 - Math.pow(1 - t, 3)
      if (wrapperRef.current) wrapperRef.current.style.willChange = 'top'
      const step = (now) => {
        const t = Math.min(1, (now - startTime) / duration)
        const eased = easeOutCubic(t)
        const y = startTop + (targetTop - startTop) * eased
        const yClamped = Math.max(minTop, Math.min(maxTop, y))
        currentTopRef.current = yClamped
        if (wrapperRef.current) wrapperRef.current.style.top = `${yClamped}px`
        if (t < 1) {
          rafRef.current = requestAnimationFrame(step)
        } else {
          currentTopRef.current = targetTop
          if (wrapperRef.current) wrapperRef.current.style.top = `${targetTop}px`
          if (wrapperRef.current) wrapperRef.current.style.willChange = ''
          setCarState('paused')
          try { if (typeof onBlockedStop === 'function') onBlockedStop({ ...carData, phase: 'stop' }) } catch {}
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
  }, [carData.isBlockedShowcase, carState])

  if (carState === 'waiting' || carState === 'gone') return null

  return (
    <div
      ref={wrapperRef}
      className="absolute left-1/2"
      style={{
        top: `${currentTopRef.current}px`,
        transform: 'translateX(-50%)',
        '--car-animation-duration': `${carData.animationDuration}ms`,
        zIndex: carData.isCrashLane ? 20 : 5
      }}
    >
      <Car
        isAnimating={!carData.isBlockedShowcase && carState === 'moving'}
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
