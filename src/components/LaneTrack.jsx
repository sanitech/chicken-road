import React, { memo } from 'react'
import { GAME_CONFIG } from '../utils/gameConfig'

function LaneTrack({ children, totalLaneWidthPx, laneTransformStyle, isJumping, jumpProgress }) {
  return (
    <div
      className="absolute flex"
      style={{
        background: GAME_CONFIG.COLORS.ASPHALT,
        filter: isJumping ? `blur(${jumpProgress * 1}px)` : 'none',
        opacity: 1,
        left: 0,
        top: 0,
        bottom: 0,
        width: `${totalLaneWidthPx}px`,
        ...laneTransformStyle,
        transition: 'none',
        zIndex: GAME_CONFIG.Z_INDEX.LANE
      }}
    >
      {children}
    </div>
  )
}

export default memo(LaneTrack)


