import React, { useState, useEffect } from 'react'
import carImage from '../assets/car1.png'

function Car({ isAnimating = false, onAnimationComplete, isContinuous = false, customSpeed = 3000, isBlocked = false, isPaused = false }) {
  const [animationClass, setAnimationClass] = useState('')

  useEffect(() => {
    if (isPaused) {
      // Car is paused by chicken jump - fast pause animation
      setAnimationClass('animate-car-paused')
    } else if (isBlocked) {
      // Car is stopped by blocker - very fast stop animation
      setAnimationClass('animate-car-stopped-fast')
    } else if (isAnimating) {
      if (isContinuous) {
        // Continuous animation for moving cars
        setAnimationClass('animate-car-move-continuous')
      } else {
        // One-time animation for crash car
        setAnimationClass('animate-car-move')
        
        // Use custom speed for animation completion
        const timer = setTimeout(() => {
          setAnimationClass('animate-car-disappear')
          if (onAnimationComplete) {
            onAnimationComplete()
          }
        }, customSpeed)

        return () => clearTimeout(timer)
      }
    } else {
      setAnimationClass('')
    }
  }, [isAnimating, onAnimationComplete, isContinuous, customSpeed, isBlocked, isPaused])

  return (
    <div 
      className={`w-[50px] h-full relative ${animationClass}`}
      style={{
        // Apply custom animation duration
        '--custom-car-duration': `${customSpeed}ms`
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