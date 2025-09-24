import React, { useState, useEffect, useRef, memo } from 'react'
import carImage from '../assets/car1.png'
import { GAME_CONFIG } from '../utils/gameConfig'

function Car({ isAnimating = false, onAnimationComplete, isContinuous = false, customSpeed = 3000, isBlocked = false, isPaused = false, spriteSrc, disableCssMotion = false }) {
  const [animationClass, setAnimationClass] = useState('')
  const containerRef = useRef(null)

  useEffect(() => {
    if (disableCssMotion) {
      setAnimationClass('')
      return
    }
    // Choose a single movement animation class and pause/play it via CSS for stability
    if (isAnimating || isPaused || isBlocked) {
      setAnimationClass(isContinuous ? 'animate-car-move-continuous' : 'animate-car-move')
    } else {
      setAnimationClass('')
    }
  }, [isAnimating, isContinuous, isBlocked, isPaused, disableCssMotion])

  // Fire completion when the non-continuous animation actually ends (respects pauses)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    if (isContinuous) return

    const handleEnd = () => {
      if (onAnimationComplete) onAnimationComplete()
    }

    el.addEventListener('animationend', handleEnd)
    return () => {
      el.removeEventListener('animationend', handleEnd)
    }
  }, [onAnimationComplete, isContinuous])

  return (
    <div 
      ref={containerRef}
      className={`relative ${animationClass}`}
      style={{
        // Apply custom animation duration
        '--custom-car-duration': `${customSpeed}ms`,
        // If CSS motion is disabled (e.g., showcase car controlled by top), avoid applying animation state
        animationPlayState: disableCssMotion ? undefined : ((isPaused || isBlocked) ? 'paused' : 'running'),
        // Hold the last frame when paused so it doesn't jump
        animationFillMode: 'both',
        // Explicit sizing from central config (avoids Tailwind arbitrary class purge issues)
        width: `${GAME_CONFIG.CAR.SIZE_PX}px`,
        height: `${GAME_CONFIG.CAR.SIZE_PX}px`
      }}
    >
      <img 
        src={spriteSrc || carImage} 
        alt="Car" 
        className="w-full h-full object-contain" 
      />  
    </div>
  )
}

export default memo(Car)