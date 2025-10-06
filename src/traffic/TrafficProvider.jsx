import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import engine from './TrafficEngine'
import { GAME_CONFIG } from '../utils/gameConfig'

const TrafficContext = createContext(null)

export function TrafficProvider({ laneCount, carSprites, children }) {
  const [snapshot, setSnapshot] = useState(() => ({ cars: new Map() }))
  const startedRef = useRef(false)
  const sprites = useMemo(() => carSprites || [], [carSprites])

  useEffect(() => {
    // Initialize engine once when we have a valid laneCount (>0)
    if (!startedRef.current && typeof laneCount === 'number' && laneCount > 0) {
      engine.init({ laneCount, cfg: GAME_CONFIG, carSprites: sprites })
      engine.start()
      startedRef.current = true
    }

    const unsub = engine.subscribe((snap) => {
      setSnapshot(snap)
    })
    return () => {
      // Keep engine running; only remove this listener
      unsub && unsub()
    }
  }, [laneCount, sprites])

  const api = useMemo(() => ({
    markCarDone: (laneIndex, carId) => engine.markDone(laneIndex, carId),
    injectCrashCar: (laneIndex, durationMs) => engine.injectCrashCar(laneIndex, durationMs),
    injectBlockedCar: (laneIndex, durationMs) => engine.injectBlockedCar(laneIndex, durationMs),
    maybeSpawnBlockedShowcase: (laneIndex) => engine.maybeSpawnBlockedShowcase(laneIndex),
    clearAllCars: () => engine.clearAllCars(),
    setLaneBlocked: (laneIndex, isBlocked) => engine.setLaneBlocked(laneIndex, isBlocked),
    boostCarSpeed: (laneIndex, carId) => engine.boostCarSpeed(laneIndex, carId),
  }), [snapshot])

  return (
    <TrafficContext.Provider value={api}>
      {children}
    </TrafficContext.Provider>
  )
}

export function useTraffic() {
  const ctx = useContext(TrafficContext)
  if (!ctx) throw new Error('useTraffic must be used within a TrafficProvider')
  return ctx
}

// Lane-specific subscription with shallow change detection to avoid unnecessary re-renders
export function useLaneCars(laneIndex) {
  const [cars, setCars] = useState([])
  const sigRef = useRef('')

  useEffect(() => {
    if (typeof laneIndex !== 'number' || laneIndex <= 0) {
      setCars([])
      sigRef.current = ''
      return
    }
    const unsub = engine.subscribe((snap) => {
      const arr = (snap?.cars?.get(laneIndex) || [])
      // Build a lightweight signature to detect meaningful changes
      const sig = arr.map(c => `${c.id}:${c.done?1:0}:${c.isBlockedShowcase?1:0}:${c.isCrashLane?1:0}:${c.animationDuration}:${c.startTime}`).join('|')
      if (sig !== sigRef.current) {
        sigRef.current = sig
        setCars(arr)
      }
    })
    return () => { unsub && unsub() }
  }, [laneIndex])

  return cars
}
