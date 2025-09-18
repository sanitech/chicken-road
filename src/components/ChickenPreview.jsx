import React, { useState, useEffect } from 'react'
import spritesImage from '../assets/sprites.png'
import './Chicken.css'

function ChickenPreview() {
  const [fps, setFps] = useState(4) // FPS for animation
  const [isAnimating, setIsAnimating] = useState(true)
  const [selectedAnimation, setSelectedAnimation] = useState("1-5") // Animation key for progressive combinations

  // Animation type names - progressive combinations and individual
  const animationTypes = {
    "1": { name: "Row 1 Only", class: "animate-chicken-row1", frames: 4 },
    "1-2": { name: "Rows 1-2", class: "animate-chicken-1-2", frames: 8 },
    "1-3": { name: "Rows 1-3", class: "animate-chicken-1-3", frames: 12 },
    "1-4": { name: "Rows 1-4", class: "animate-chicken-1-4", frames: 16 },
    "1-5": { name: "Rows 1-5", class: "animate-chicken-1-5", frames: 20 },
    "1-6": { name: "Rows 1-6", class: "animate-chicken-1-6", frames: 24 }
  }

  // Calculate animation duration based on FPS and frame count
  const getAnimationDuration = (animationKey) => {
    const frameCount = animationTypes[animationKey]?.frames || 4
    return `${frameCount / fps}s`
  }

  const animationDuration = getAnimationDuration(selectedAnimation)

  // Calculate sprite position for a specific frame (static display)
  const getSpriteStyle = (frame, row = 0) => {
    const spriteWidth = 200 // Each chicken frame is 200px wide
    const spriteHeight = 166 // Each chicken frame is 166px tall
    const totalWidth = 1000 // Total sprite sheet width
    const totalHeight = 1228 // Total sprite sheet height

    // Calculate position in sprite sheet (horizontal frames)
    const x = frame * spriteWidth // Move right by frame number * width
    const y = row * spriteHeight // Move down by row number * height

    return {
      backgroundImage: `url(${spritesImage})`,
      backgroundSize: `${totalWidth}px ${totalHeight}px`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: `-${x}px -${y}px`,
      width: `${spriteWidth}px`,
      height: `${spriteHeight}px`,
      border: '2px solid #333',
      borderRadius: '8px',
      imageRendering: 'pixelated'
    }
  }

  // Style for animated chicken
  const getAnimatedSpriteStyle = (animationType = selectedAnimation) => {
    return {
      width: '200px',
      height: '166px',
      backgroundImage: `url(${spritesImage})`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: '1000px 1228px',
      imageRendering: 'pixelated',
      '--animation-duration': animationDuration
    }
  }

  return (
    <div className="min-h-screen bg-gray-800 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Chicken Animation Preview</h1>

        {/* Controls */}
        <div className="bg-gray-700 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Animation Controls</h2>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              className={`px-4 py-2 rounded-lg font-medium ${
                isAnimating
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isAnimating ? 'Pause' : 'Play'}
            </button>
          </div>

          {/* Animation Type Selection */}
          <div className="mb-4">
            <label className="text-sm font-medium mb-2 block">Animation Type:</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(animationTypes).map(([key, anim]) => (
                <button
                  key={key}
                  onClick={() => setSelectedAnimation(key)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedAnimation === key
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                >
                  {anim.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">FPS:</label>
            <input
              type="range"
              min="1"
              max="30"
              value={fps}
              onChange={(e) => setFps(parseInt(e.target.value))}
              className="flex-1"
            />
            <span className="text-lg font-bold w-12">{fps}</span>
          </div>

          <div className="mt-4 text-sm text-gray-300">
            <p>Current: <strong>{animationTypes[selectedAnimation].name}</strong></p>
            <p>Animation Speed: {fps} FPS ({Math.round(1000/fps)}ms per frame)</p>
            <p>Frames per cycle: {animationTypes[selectedAnimation]?.frames || 4} frames</p>
          </div>
        </div>

        {/* Progressive Animation Combinations */}
        <div className="bg-gray-700 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-6">Progressive Animation Combinations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(animationTypes).map(([key, anim]) => (
              <div key={key} className="text-center">
                <h3 className="text-lg font-medium mb-4">{anim.name}</h3>
                <div className="flex justify-center">
                  <div
                    style={getAnimatedSpriteStyle(key)}
                    className={`chicken-sprite ${isAnimating ? anim.class : ''}`}
                  />
                </div>
                <p className="text-sm text-gray-300 mt-2">
                  {isAnimating ? `Playing at ${fps} FPS` : 'Paused'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {anim.frames} frames
                </p>
              </div>
            ))}
          </div>
        </div>



        {/* Sprite Sheet Info */}
        <div className="bg-gray-700 rounded-lg p-6 mt-8">
          <h2 className="text-xl font-semibold mb-4">Sprite Sheet Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p><strong>Image Size:</strong> 1000x1228 pixels</p>
              <p><strong>Frame Size:</strong> 200x166 pixels</p>
              <p><strong>Total Frames:</strong> 24 frames (4×6 grid)</p>
              <p><strong>Animation Rows:</strong> 6 rows, 4 frames each</p>
            </div>
            <div>
              <p><strong>Margins:</strong> Right: 200px, Bottom: 62px</p>
              <p><strong>Frame Area:</strong> 800x996 pixels (4×6 frames)</p>
              <p><strong>Frame Position:</strong> Horizontal layout per row</p>
              <p><strong>Animation:</strong> Left-to-right cycling through frames</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChickenPreview
