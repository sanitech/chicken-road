import React from 'react'
import chickenImage from '../assets/chiken.png'
import deadChickenImage from '../assets/chickendead.png'
import oddsBottomImage from '../assets/oddsbottom.png'
import spritesImage from '../assets/sprites.png'
import './Chicken.css'

function Chicken({
  isDead = false,
  currentMultiplier,
  showMultiplier = true,
  className = "object-contain drop-shadow-md", // Removed fixed size to use sprite's natural mobile size
  isJumping = false,
  animationFrame = 0,
  fps = 4
}) {
  // Calculate animation duration based on FPS (4 frames per cycle)
  const animationDuration = `${4 / fps}s`

  // Calculate sprite style - Mobile optimized smaller size
  const getSpriteStyle = () => {
    if (isDead) {
      return {
        backgroundImage: `url(${deadChickenImage})`,
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        width: '120px', // Reduced from 200px
        height: '100px'  // Reduced from 166px
      }
    }

    // Use sprites.png for animation - Mobile optimized dimensions
    const spriteWidth = 120 // Reduced from 200px for mobile
    const spriteHeight = 100 // Reduced from 166px for mobile
    const totalWidth = 600  // Scaled down from 1000px
    const totalHeight = 737 // Scaled down from 1228px

    // Determine which row to use (1-4)
    const rowNumber = isJumping ? 2 : 1 // Use walking (row 2) for jumping, idle (row 1) for normal

    return {
      backgroundImage: `url(${spritesImage})`,
      backgroundSize: `${totalWidth}px ${totalHeight}px`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: '0px 0px', // Will be animated by CSS
      width: `${spriteWidth}px`,
      height: `${spriteHeight}px`,
      imageRendering: 'pixelated',
      '--animation-duration': animationDuration,
      display: 'block'
    }
  }

  return (
    <div className="relative flex items-center justify-center" style={{ width: '120px', height: '100px' }}>
      {/* Chicken sprite - Mobile optimized */}
      <div
        style={getSpriteStyle()}
        className={`chicken-sprite ${isJumping ? 'animate-chicken-jump' : 'animate-chicken-walk'} ${className}`}
      />

      {/* Current multiplier value below chicken - Mobile optimized */}
      {showMultiplier && currentMultiplier && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2">
          <div
            className="flex items-center justify-center w-12 h-6"
            style={{
              backgroundImage: `url(${oddsBottomImage})`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center'
            }}
          >
            <span className="text-white font-bold text-xs">
              {currentMultiplier.toFixed(2)}x
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default Chicken
