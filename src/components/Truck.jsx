import React, { useState, useEffect } from 'react'
import carImage from '../assets/car1.png'
import audioManager from '../utils/audioUtils'

function Truck({ isAnimating = false, onAnimationComplete, isContinuous = false, hasBlocker = false }) {
  const [animationClass, setAnimationClass] = useState('')

  useEffect(() => {
    if (isAnimating) {
      if (isContinuous && !hasBlocker) {
        // Continuous animation for moving trucks without blockers
        setAnimationClass('animate-car-move-continuous')
      } else if (isContinuous && hasBlocker) {
        // Truck moves but stops at blocker position with braking sound
        setAnimationClass('animate-car-move-to-blocker')
        
        // Play braking sound after 2.5 seconds (when truck starts braking)
        const brakeTimer = setTimeout(() => {
          audioManager.playBrakeSound()
        }, 2500)
        
        return () => clearTimeout(brakeTimer)
      } else {
        // One-time animation for crash truck
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
    <div className={`w-[60px] h-full relative ${animationClass} drop-shadow-lg`}>
      <div className="relative w-full h-full">
        {/* Truck body with green and white sections */}
        <div className="absolute inset-0 bg-gradient-to-b from-green-500 to-green-600 rounded-lg transform rotate-12 scale-75">
          {/* Truck cab (green section) */}
          <div className="absolute top-0 left-0 w-1/3 h-full bg-green-500 rounded-l-lg"></div>
          
          {/* Truck cargo area (white section) */}
          <div className="absolute top-0 right-0 w-2/3 h-full bg-white rounded-r-lg border-l-2 border-green-500"></div>
          
          {/* Headlights */}
          <div className="absolute top-1 left-1 w-2 h-2 bg-yellow-200 rounded-full"></div>
          <div className="absolute top-1 left-4 w-2 h-2 bg-yellow-200 rounded-full"></div>
          
          {/* Overlay the original car image for details */}
          <img 
            src={carImage} 
            alt="Delivery Truck" 
            className="absolute inset-0 w-full h-full object-contain opacity-30" 
          />
        </div>
      </div>
    </div>
  )
}

export default Truck
