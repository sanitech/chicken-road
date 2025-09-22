import React, { useState, useEffect, useRef } from 'react'
import carImage from '../assets/car1.png'
import { GAME_CONFIG } from '../utils/gameConfig'

function Car({ isAnimating = false, onAnimationComplete, isContinuous = false, customSpeed = 3000, isBlocked = false, isPaused = false, spriteSrc }) {
  const [animationClass, setAnimationClass] = useState('')
  const containerRef = useRef(null)

  useEffect(() => {
    // Choose a single movement animation class and pause/play it via CSS for stability
    if (isAnimating || isPaused || isBlocked) {
      setAnimationClass(isContinuous ? 'animate-car-move-continuous' : 'animate-car-move')
    } else {
      setAnimationClass('')
    }
  }, [isAnimating, isContinuous, isBlocked, isPaused])

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
      className={`w-[${GAME_CONFIG.CAR.SIZE_PX}px] relative ${animationClass}`}
      style={{
        // Apply custom animation duration
        '--custom-car-duration': `${customSpeed}ms`,
        // Pause the animation without changing keyframes to avoid snapping
        animationPlayState: (isPaused || isBlocked) ? 'paused' : 'running',
        // Hold the last frame when paused so it doesn't jump
        animationFillMode: 'both'
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

export default Car