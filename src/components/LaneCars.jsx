import React, { memo } from 'react'
import DynamicCar from './DynamicCar'

function LaneCars({ carsForLane, hasBlocker, onCarBlockedStop, markDone }) {
  const cars = carsForLane || []
  if (!cars.length) return null
  return cars.map((carData) => (
    <DynamicCar
      key={carData.id}
      carData={carData}
      hasBlocker={hasBlocker && !carData.isBlockedShowcase}
      onBlockedStop={onCarBlockedStop}
      onAnimationComplete={() => {
        if (typeof markDone === 'function') markDone(carData.id)
      }}
    />
  ))
}

export default memo(LaneCars)


