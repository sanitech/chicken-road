import React from 'react'
import deadChickenImage from '../assets/chickendead.png'
import oddsBottomImage from '../assets/oddsbottom.png'
import chickenGif from '../assets/chichen.gif'
import './Chicken.css'
import { GAME_CONFIG } from '../utils/gameConfig'

function Chicken({
  isDead = false,
  currentMultiplier,
  showMultiplier = true,
  className = "object-contain drop-shadow-md",
  isJumping = false,
  animationFrame = 0,
  fps = 4,
  size = "auto" // auto, small, medium, large, or custom number
}) {
  // Get responsive chicken size
  const getChickenSize = () => {
    if (typeof size === 'number') {
      return { width: `${size}px`, height: `${size}px` }
    }

    switch (size) {
      case 'small':
        return { width: '100px', height: '100px' }
      case 'medium':
        return { width: '200px', height: '200px' }
      case 'large':
        return { width: '300px', height: '300px' }
      case 'auto':
      default:
        // Fixed size based on central config
        return { width: `${GAME_CONFIG.CHICKEN_SIZE_PX}px`, height: `${GAME_CONFIG.CHICKEN_SIZE_PX}px` }
    }
  }

  const chickenSize = getChickenSize()

  return (
    <div className="relative flex items-center justify-center" style={chickenSize}>
      {/* Dead state: show static dead chicken image */}
      {isDead ? (
        <div
          style={{
            backgroundImage: `url(${deadChickenImage})`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            ...chickenSize,
            imageRendering: 'auto',
            display: 'block'
          }}
          className={`${className}`}
        />
      ) : (
        <img
          src={chickenGif}
          alt="Chicken"
          className={`${className}`}
          style={{
            width: chickenSize.width,
            height: chickenSize.height,
            objectFit: 'contain',
            imageRendering: 'auto'
          }}
        />
      )}

      {/* Current multiplier value below chicken - Responsive */}
      {showMultiplier && currentMultiplier && (
        <div 
          className="absolute left-1/2 transform -translate-x-1/2"
          style={{
            top: `${parseInt(chickenSize.height) + 4}px` // Position below chicken with 4px gap
          }}
        >
          <div
            className="flex items-center justify-center h-16 w-16"
            style={{
              backgroundImage: `url(${oddsBottomImage})`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
            }}
          >
            <span 
              className="text-white font-bold"
              style={{
                fontSize: `${Math.max(10, parseInt(chickenSize.width) * 0.15)}px` // Scale text with chicken
              }}
            >
              {currentMultiplier.toFixed(2)}x
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default Chicken
