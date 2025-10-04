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
  const accelerateOutCalledRef = useRef(false) // Prevent double-call

  // Helper: accelerate car out of the lane quickly from its current top
  const accelerateOut = () => {
    // Prevent double-call race condition
    if (accelerateOutCalledRef.current) {
      console.log(`[DynamicCar] accelerateOut already called for car ${carData.id}, skipping`)
      return
    }
    accelerateOutCalledRef.current = true
    
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
    accelerateOutCalledRef.current = false
    console.log(`[DynamicCar] Initialized car ${carData.id} in lane ${carData.laneIndex}`)
  }, [carData.id])

  // Regular moving cars AND blocked showcase cars: animate from spawn to destination
  useEffect(() => {
    if (!carData.isCrashLane && carState === 'moving' && !hasBlocker) {
      const el = wrapperRef.current
      if (!el) return
      const laneEl = el.parentElement
      if (!laneEl) return
      const laneHeight = laneEl.clientHeight
      const startTop = currentTopRef.current
      
      // Determine destination based on car type
      let endTop
      let duration
      let isStoppingCar = false
      
      if (carData.isBlockedShowcase) {
        // Blocked showcase: stop at configured position
        const stopTopPercent = GAME_CONFIG.CAR?.STOP_TOP_PERCENT ?? 8
        endTop = (laneHeight * (stopTopPercent / 100)) - (GAME_CONFIG.CAR.SIZE_PX * 0.5)
        // Use same duration as regular cars for natural speed
        duration = carData.animationDuration || 2500
        isStoppingCar = true
      } else {
        // Regular car: exit below viewport
        const exitOffset = GAME_CONFIG.CAR.EXIT_TOP_OFFSET_PX || 200
        endTop = laneHeight + exitOffset
        duration = carData.animationDuration || 3000
      }
      
      const startTime = performance.now()
      
      const step = (now) => {
        const t = Math.min(1, (now - startTime) / duration)
        let y = startTop + (endTop - startTop) * t
        
        // CRITICAL: Clamp position to never overshoot the target
        // This ensures blocking cars stop exactly at the blocker position
        if (isStoppingCar) {
          // For stopping cars, ensure we never go past the stop position
          if (startTop < endTop) {
            y = Math.min(y, endTop) // Moving down, don't overshoot
          } else {
            y = Math.max(y, endTop) // Moving up, don't overshoot
          }
        }
        
        currentTopRef.current = y
        if (wrapperRef.current) wrapperRef.current.style.top = `${y}px`
        
        if (t < 1) {
          rafRef.current = requestAnimationFrame(step)
        } else {
          // On final frame, explicitly set to exact target position
          if (isStoppingCar) {
            currentTopRef.current = endTop
            if (wrapperRef.current) wrapperRef.current.style.top = `${endTop}px`
            setCarState('paused')
            try { if (typeof onBlockedStop === 'function') onBlockedStop({ ...carData, phase: 'stop' }) } catch {}
          } else {
            setCarState('gone')
            try { if (typeof onAnimationComplete === 'function') onAnimationComplete() } catch {}
          }
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
  }, [carData.isBlockedShowcase, carState, hasBlocker, carData.animationDuration, carData.isCrashLane])

  // Crash cars: accelerate out quickly from current position
  useEffect(() => {
    if (carData.isCrashLane && carState === 'moving') {
      // Use the existing accelerateOut function for crash cars
      accelerateOut()
    }
  }, [carData.isCrashLane, carState])


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
