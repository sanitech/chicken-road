import React, { memo } from 'react'
import LaneSegment from './LaneSegment'
import LaneCars from './LaneCars'
import { useLaneCars } from '../traffic/TrafficProvider'

function LaneRow({ lane, globalCurrentIndex, allLanes, onCarBlockedStop, markCarDone, isJumping, traffic }) {
  const { globalIndex, isSidewalk, isCurrent, isCrashLane, computedHasBlocker } = lane
  const carsForLane = useLaneCars(globalIndex)

  return (
    <LaneSegment
      lane={lane}
      globalCurrentIndex={globalCurrentIndex}
      allLanes={allLanes}
    >
      <LaneCars
        carsForLane={carsForLane}
        hasBlocker={computedHasBlocker}
        onCarBlockedStop={onCarBlockedStop}
        markDone={(carId) => markCarDone(globalIndex, carId)}
      />

      {!isSidewalk && !isJumping && isCurrent && computedHasBlocker && !isCrashLane && typeof traffic.maybeSpawnBlockedShowcase === 'function' && (
        (() => {
          if (!LaneRow._landingOnce) LaneRow._landingOnce = new Set()
          const key = `land-block-${globalIndex}-${globalCurrentIndex}`
          if (!LaneRow._landingOnce.has(key)) {
            LaneRow._landingOnce.add(key)
            try { traffic.maybeSpawnBlockedShowcase(globalIndex) } catch (e) {}
          }
          return null
        })()
      )}
    </LaneSegment>
  )
}

export default memo(LaneRow)


