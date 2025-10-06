import React, { memo } from 'react'
import { GAME_CONFIG } from '../utils/gameConfig'
import cap1Image from '../assets/cap1.png'
import cap2Image from '../assets/cap2.png'
import blockerImage from '../assets/blocker.png'
import sideRoadImage from '../assets/sideroad.png'

function LaneCap({ isCurrent, isCompleted, isDestinationLane, globalCurrentIndex, sizePx, objectPosition, multiplier }) {
  if (isCurrent) return null
  return (
    <>
      <img
        src={isCompleted ? cap2Image : cap1Image}
        alt={isCompleted ? 'Completed Lane Cap' : 'Lane Cap'}
        className="mx-auto object-contain"
        style={{ 
          objectPosition,
          width: `${sizePx}px`,
          height: `${sizePx}px`,
          opacity: isCompleted ? 0.9 : (globalCurrentIndex > 0 && isDestinationLane ? 1 : 0.7),
          transition: 'opacity 150ms ease-in-out'
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={`${sizePx}px`}
          height={`${sizePx}px`}
          viewBox={`0 0 ${sizePx} ${sizePx}`}
          style={{ display: 'block' }}
          aria-hidden
        >
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="middle"
            fill={GAME_CONFIG.COLORS.BRIGHT_TEXT}
            stroke="#000"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
            paintOrder="stroke"
            opacity={(globalCurrentIndex > 0 && isDestinationLane) ? "1" : "0.7"}
            strokeOpacity={(globalCurrentIndex > 0 && isDestinationLane) ? "1" : "0.7"}
            style={{ fontSize: `20px`, fontWeight: 700 }}
          >
            {multiplier}
          </text>
        </svg>
      </div>
    </>
  )
}

function LaneBlocker() {
  return (
    <div className="absolute left-0 right-0 h-8 flex items-center justify-center animate-fade-in"
      style={{ 
        top: `${GAME_CONFIG.BLOCKER.TOP_PERCENT}%`, 
        marginTop: '-1rem',
        zIndex: GAME_CONFIG.Z_INDEX.BLOCKER 
      }}>
      <img
        src={blockerImage}
        alt="Blocker"
        className="object-contain"
        style={{
          width: `${GAME_CONFIG.BLOCKER.SIZE_PX}px`,
          height: `${GAME_CONFIG.BLOCKER.SIZE_PX}px`
        }}
      />
    </div>
  )
}

function LaneSegment({
  lane,
  globalCurrentIndex,
  allLanes,
  children
}) {
  const { globalIndex, widthPx, isSidewalk, isCompleted, isCurrent, isCrashLane, isDestinationLane, computedHasBlocker } = lane

  return (
    <div
      className={`relative ${!isSidewalk ? 'flex items-end pb-52' : ''}`}
      style={{ width: `${widthPx}px` }}
    >
      {isSidewalk && (
        <img
          src={sideRoadImage}
          alt="Side Road"
          className="w-full object-cover"
          style={{ objectPosition: 'bottom center', zIndex: 1 }}
        />
      )}

      {!isSidewalk && (
        <div
          className="absolute left-1/2 -translate-x-1/2 p-4"
          style={{
            top: `${GAME_CONFIG.CAP.TOP_PERCENT}%`,
            transform: 'translate(-50%, -50%)',
            zIndex: GAME_CONFIG.Z_INDEX.CAP,
            width: '100%',
            pointerEvents: 'none'
          }}
        >
          <LaneCap
            isCurrent={isCurrent}
            isCompleted={isCompleted}
            isDestinationLane={isDestinationLane}
            globalCurrentIndex={globalCurrentIndex}
            sizePx={GAME_CONFIG.CAP.SIZE_PX}
            objectPosition={GAME_CONFIG.CAP.OBJECT_POSITION}
            multiplier={`${allLanes[globalIndex - 1]?.toFixed(2)}x`}
          />
        </div>
      )}

      {children}

      {(!isSidewalk && computedHasBlocker && !isCrashLane) && (
        <LaneBlocker />
      )}

      {globalIndex > 0 && globalIndex < allLanes.length - 1 && (
        <div className="absolute right-0 top-0 bottom-0 w-1 bg-transparent z-10">
          <div className="lane-divider-dashes"></div>
        </div>
      )}
    </div>
  )
}

export default memo(LaneSegment)


