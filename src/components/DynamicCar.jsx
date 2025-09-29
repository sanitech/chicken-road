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
    const endTop = laneHeight + (GAME_CONFIG.CAR.EXIT_TOP_OFFSET_PX || 200)
    // Use crash duration from car data (engine) or fall back to config
    const configuredCrash = (carData && carData.animationDuration) || (GAME_CONFIG?.CRASH?.DURATION_MS ?? 900)
    const duration = Math.max(300, configuredCrash)
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

  // Regular moving cars: animate from spawn to exit offset
  useEffect(() => {
    if (!carData.isBlockedShowcase && !carData.isCrashLane && carState === 'moving' && !hasBlocker) {
      const el = wrapperRef.current
      if (!el) return
      const laneEl = el.parentElement
      if (!laneEl) return
      const laneHeight = laneEl.clientHeight
      const exitOffset = GAME_CONFIG.CAR.EXIT_TOP_OFFSET_PX || 200
      const endTop = laneHeight + exitOffset
      const startTop = currentTopRef.current
      const duration = carData.animationDuration || 3000
      const startTime = performance.now()
      
      const step = (now) => {
        const t = Math.min(1, (now - startTime) / duration)
        const y = startTop + (endTop - startTop) * t
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

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [carData.isBlockedShowcase, carState, hasBlocker, carData.animationDuration])

  // Crash cars: accelerate out quickly from current position
  useEffect(() => {
    if (carData.isCrashLane && carState === 'moving') {
      // Use the existing accelerateOut function for crash cars
      accelerateOut()
    }
  }, [carData.isCrashLane, carState])

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
      // Determine startTop:
      // - For promoted cars, continue from the current on-screen top to avoid snapping.
      // - For freshly injected showcase cars, start from the configured spawn offset.
      let startTop = spawnOffset
      if (carData.promotedFromRegular) {
        // Try to read computed style; fallback to ref value
        try {
          const cs = window.getComputedStyle(el)
          const parsed = parseFloat(cs.top)
          if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
            startTop = parsed
          } else if (Number.isFinite(currentTopRef.current)) {
            startTop = currentTopRef.current
          }
        } catch {}
      } else {
        // Fresh showcase: start from spawn offset
        if (wrapperRef.current) wrapperRef.current.style.top = `${startTop}px`
      }
      currentTopRef.current = startTop
      // Small deceleration animation (quick but noticeable)
      const configured = GAME_CONFIG.TRAFFIC?.BLOCKED_SHOWCASE?.DECEL_DURATION_MS ?? 700
      const duration = Math.min(600, Math.max(250, configured))
      const startTime = performance.now()
      const easeOutCubic = t => 1 - Math.pow(1 - t, 3)
      if (wrapperRef.current) wrapperRef.current.style.willChange = 'top'
      const direction = targetTop >= startTop ? 1 : -1
      const step = (now) => {
        const t = Math.min(1, (now - startTime) / duration)
        const eased = easeOutCubic(t)
        const yRaw = startTop + (targetTop - startTop) * eased
        // Prevent crossing the target to avoid visible snap-back
        const yBounded = direction > 0 ? Math.min(yRaw, targetTop) : Math.max(yRaw, targetTop)
        const yClamped = Math.max(minTop, Math.min(maxTop, yBounded))
        currentTopRef.current = yClamped
        if (wrapperRef.current) wrapperRef.current.style.top = `${yClamped}px`
        if (t < 1) {
          rafRef.current = requestAnimationFrame(step)
        } else {
          // Do NOT snap to exact target; keep the last bounded position to avoid jolt
          currentTopRef.current = yClamped
          if (wrapperRef.current) wrapperRef.current.style.top = `${yClamped}px`
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
        '--car-start-offset': `${GAME_CONFIG.CAR.SPAWN_TOP_OFFSET_PX}px`,
        '--car-end-offset': `${GAME_CONFIG.CAR.EXIT_TOP_OFFSET_PX}px`,
        zIndex: carData.isCrashLane ? 20 : 5
      }}
    >
      <Car
        isAnimating={false} // Disable CSS animation, we handle movement manually
        isContinuous={false} // Single-run so cars finish naturally and are not swapped mid-way
        onAnimationComplete={onAnimationComplete} // Bubble completion to parent to mark car as done
        customSpeed={carData.animationDuration}
        isBlocked={carState === 'paused'}
        isPaused={carState === 'paused'}
        disableCssMotion={true} // Always disable CSS motion, use manual positioning
        spriteSrc={carData.spriteSrc}
      />
    </div>
  )
}

export default memo(DynamicCar)
