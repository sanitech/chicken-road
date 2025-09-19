import React from 'react'
import chickenImage from '../assets/chiken.png'
import deadChickenImage from '../assets/chickendead.png'
import oddsBottomImage from '../assets/oddsbottom.png'
import spritesImage from '../assets/sprites.png'
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
  // Calculate animation duration based on FPS (4 frames per cycle)
  const animationDuration = `${4 / fps}s`

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

  // Simple chicken image style - no complex sprites
  const getChickenImageStyle = () => {
    if (isDead) {
      return {
        backgroundImage: `url(${deadChickenImage})`,
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        ...chickenSize  // Use responsive size
      }
    }

    // Use simple chicken image - clean and mobile-optimized
    return {
      backgroundImage: `url(${chickenImage})`,
      backgroundSize: 'contain',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      ...chickenSize,  // Use responsive size
      imageRendering: 'auto', // Smooth rendering for simple image
      display: 'block'
    }
  }

  return (
    <div className="relative flex items-center justify-center" style={chickenSize}>
      {/* Simple Chicken Image - Clean and Mobile-Friendly */}
      <div
        style={getChickenImageStyle()}
        className={`${className}`}
      />

      {/* Current multiplier value below chicken - Responsive */}
      {showMultiplier && currentMultiplier && (
        <div 
          className="absolute left-1/2 transform -translate-x-1/2"
          style={{
            top: `${parseInt(chickenSize.height) + 4}px` // Position below chicken with 4px gap
          }}
        >
          <div
            className="flex items-center justify-center"
            style={{
              backgroundImage: `url(${oddsBottomImage})`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              // Scale multiplier badge with chicken size
              width: `${Math.max(48, parseInt(chickenSize.width) * 0.6)}px`,
              height: `${Math.max(24, parseInt(chickenSize.height) * 0.3)}px`
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
