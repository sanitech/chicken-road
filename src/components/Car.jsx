import React, { useState, useEffect } from 'react'
import carImage from '../assets/car1.png'
import { GAME_CONFIG } from '../utils/gameConfig'

function Car({ isAnimating = false, onAnimationComplete, isContinuous = false, customSpeed = 3000, isBlocked = false, isPaused = false }) {
  const [animationClass, setAnimationClass] = useState('')

  useEffect(() => {
    // Choose a single movement animation class and pause/play it via CSS for stability
    if (isAnimating || isPaused || isBlocked) {
      setAnimationClass(isContinuous ? 'animate-car-move-continuous' : 'animate-car-move')

      // For one-time animation (non-continuous), signal completion ONLY when actually moving
      if (!isContinuous && isAnimating && !isPaused && !isBlocked) {
        const timer = setTimeout(() => {
          if (onAnimationComplete) onAnimationComplete()
        }, customSpeed)
        return () => clearTimeout(timer)
      }
    } else {
      setAnimationClass('')
    }
  }, [isAnimating, onAnimationComplete, isContinuous, customSpeed, isBlocked, isPaused])

  return (
    <div 
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
        src={carImage} 
        alt="Car" 
        className="w-full h-full object-contain" 
      />  
    </div>
  )
}

export default Car