import React, { useState, useEffect } from 'react'
import carImage from '../assets/car1.png'

function Car({ isAnimating = false, onAnimationComplete, isContinuous = false, hasBlocker = false }) {
  const [animationClass, setAnimationClass] = useState('')

  useEffect(() => {
    if (isAnimating) {
      if (isContinuous && !hasBlocker) {
        // Continuous animation for moving cars without blockers
        setAnimationClass('animate-car-move-continuous')
      } else if (isContinuous && hasBlocker) {
        // Car moves but stops at blocker position
        setAnimationClass('animate-car-move-to-blocker')
      } else {
        // One-time animation for crash car
        setAnimationClass('animate-car-move')
        
        // Set timeout for animation completion (3 seconds)
        const timer = setTimeout(() => {
          setAnimationClass('animate-car-disappear')
          if (onAnimationComplete) {
            onAnimationComplete()
          }
        }, 3000)

        return () => clearTimeout(timer)
      }
    }
  }, [isAnimating, onAnimationComplete, isContinuous, hasBlocker])

  return (
    <div className={`w-[50px] h-full relative ${animationClass} drop-shadow-lg`}>
      <img 
        src={carImage} 
        alt="Car" 
        className="w-full h-full object-contain filter brightness-110 contrast-110" 
      />  
    </div>
  )
}

export default Car