import React, { memo } from 'react'
import { GAME_CONFIG } from '../utils/gameConfig'
import Chicken from './Chicken'

function ChickenLayer({ style, isDead, currentMultiplier, showMultiplier, isJumping, jumpProgress }) {
  return (
    <div
      className="absolute"
      style={{
        ...style,
        zIndex: GAME_CONFIG.Z_INDEX.CHICKEN
      }}
    >
      <Chicken
        isDead={isDead}
        currentMultiplier={currentMultiplier}
        showMultiplier={showMultiplier}
        isJumping={isJumping}
        animationFrame={Math.floor(jumpProgress * 6) % 6}
        fps={4}
        size="auto"
      />
    </div>
  )
}

export default memo(ChickenLayer)


