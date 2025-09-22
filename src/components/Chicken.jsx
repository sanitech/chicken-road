import React from 'react'
import chickenImage from '../assets/chiken.png'
import deadChickenImage from '../assets/chickendead.png'
import oddsBottomImage from '../assets/oddsbottom.png'
import spritesImage from '../assets/sprites.png'
import SpriteAnimator from './SpriteAnimator'
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

  // Scale SpriteAnimator to match requested chicken size (approximate)
  // Using active content size similar to vite-project sample. Adjust if your sheet differs.
  const COLUMNS = 4
  const ROWS = 6
  const CONTENT_WIDTH = 390
  const CONTENT_HEIGHT = 660
  const approxFrameWidth = CONTENT_WIDTH / COLUMNS
  const scale = Math.max(0.1, parseInt(chickenSize.width) / approxFrameWidth)

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
        <SpriteAnimator
          imageUrl={spritesImage}
          columns={COLUMNS}
          rows={ROWS}
          // Choose sprite column by state: 0 = jump/active, 1 = idle/walk baseline
          columnIndex={isJumping ? 0 : 1}
          fps={Math.max(1, fps)}
          pixelated
          contentWidth={CONTENT_WIDTH}
          contentHeight={CONTENT_HEIGHT}
          scale={scale}
          // Preserve original delay/pause behavior for idle state similar to vite example
          {...(!isJumping ? {
            perRowYOffset: [-4, -2, -4, -4, -4, -4],
            restEveryLoops: 2,
            restDurationMs: 300,
            restAt: 'last'
          } : {})}
          // Provide subtle per-row Y-offsets to stabilize baseline if needed (optional)
          // perRowYOffset={[0, -2, 0, 0, 0, 0]}
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
