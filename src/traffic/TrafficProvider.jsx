import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import engine from './TrafficEngine'
import { GAME_CONFIG } from '../utils/gameConfig'

const TrafficContext = createContext(null)

export function TrafficProvider({ laneCount, carSprites, children }) {
  const [snapshot, setSnapshot] = useState(() => ({ cars: new Map() }))
  const startedRef = useRef(false)
  const sprites = useMemo(() => carSprites || [], [carSprites])

  useEffect(() => {
    // Initialize engine once per laneCount/config/sprites change
    engine.init({ laneCount, cfg: GAME_CONFIG, carSprites: sprites })
    if (!startedRef.current) {
      engine.start()
      startedRef.current = true
    }
    const unsub = engine.subscribe((snap) => {
      setSnapshot(snap)
    })
    return () => {
      // Keep engine running across unmounts; only unsubscribe listener
      unsub && unsub()
    }
  }, [laneCount, sprites])

  const api = useMemo(() => ({
    getCarsMap: () => snapshot.cars || new Map(),
    markCarDone: (laneIndex, carId) => engine.markDone(laneIndex, carId),
    injectCrashCar: (laneIndex, durationMs) => engine.injectCrashCar(laneIndex, durationMs),
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
