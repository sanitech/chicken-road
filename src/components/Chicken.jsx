import React from 'react'
import chickenImage from '../assets/chiken.png'
import deadChickenImage from '../assets/chickendead.png'
import oddsBottomImage from '../assets/oddsbottom.png'

function Chicken({ 
  isDead = false, 
  currentMultiplier, 
  showMultiplier = true,
  className = "object-contain drop-shadow-md"
}) {
  return (
    <div className="relative flex items-center justify-center drop-shadow-lg">
      {/* Chicken image */}
      <img
        src={isDead ? deadChickenImage : chickenImage}
        alt={isDead ? "Dead Chicken" : "Chicken"}
        className={`${className} filter brightness-110 contrast-110`}
      />
      
      {/* Current multiplier value below chicken - only show if showMultiplier is true and currentMultiplier is provided */}
      {showMultiplier && currentMultiplier && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2">
          <div 
            className="flex items-center justify-center w-16 h-8"
            style={{
              backgroundImage: `url(${oddsBottomImage})`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center'
            }}
          >
            <span className="text-white font-bold text-sm">
              {currentMultiplier.toFixed(2)}x
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default Chicken
