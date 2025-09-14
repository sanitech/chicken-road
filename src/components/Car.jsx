import React, { useState, useEffect } from 'react'
import carImage from '../assets/car1.png'

function Car({ isAnimating = false, onAnimationComplete, isContinuous = false }) {
  const [animationClass, setAnimationClass] = useState('')

  useEffect(() => {
    if (isAnimating) {
      if (isContinuous) {
        // Continuous animation for moving cars
        setAnimationClass('animate-car-move-continuous')
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
  }, [isAnimating, onAnimationComplete, isContinuous])

  return (
    <div className={`w-[50px] h-full relative ${animationClass}`}>
      <img 
        src={carImage} 
        alt="Car" 
        className="w-full h-full object-contain" 
      />  
    </div>
  )
}

export default Car