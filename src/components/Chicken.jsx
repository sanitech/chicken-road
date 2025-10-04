import React from 'react'
import deadChickenImage from '../assets/chickendead.png'
import oddsBottomImage from '../assets/oddsbottom.png'
import chickenGif from '../assets/chichen.gif'
import chickenJumpGif from '../assets/chickenJump.gif'
import './Chicken.css'
import { GAME_CONFIG } from '../utils/gameConfig'

function Chicken({
  isDead = false,
  currentMultiplier,
  showMultiplier = true,
  className = "object-contain drop-shadow-md",
  isJumping = false,
  animationFrame = 0,
  fps = 4
}) {
  // Chicken dimensions from config
  const chickenWidth = GAME_CONFIG.CHICKEN_WIDTH_PX
  const chickenHeight = GAME_CONFIG.CHICKEN_HEIGHT_PX

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: `${chickenWidth}px`, height: `${chickenHeight}px` }}
    >
      {/* Dead state: show static dead chicken image */}
      {isDead ? (
        <div
          style={{
            backgroundImage: `url(${deadChickenImage})`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            width: `${chickenWidth}px`,
            height: `${chickenHeight}px`,
            imageRendering: 'auto',
            display: 'block'
          }}
          className={`${className}`}
        />
      ) : (
        <img
          src={isJumping ? chickenJumpGif : chickenGif}
          alt="Chicken"
          className={`${className}`}
          style={{
            width: `${chickenWidth}px`,
            height: `${chickenHeight}px`,
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
            top: `${chickenHeight + 4}px` // Position below chicken with 4px gap
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
                fontSize: `${Math.max(10, chickenWidth * 0.15)}px` // Scale text with chicken
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
