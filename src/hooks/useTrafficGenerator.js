import { useEffect, useMemo, useRef, useState } from 'react'
import { GAME_CONFIG } from '../utils/gameConfig'

// Hook that encapsulates stochastic traffic generation and cleanup.
// Returns dynamicCars Map<laneIndex, CarData[]> and a markCarDone helper.
export function useTrafficGenerator({
  remainingMultipliers,
  globalDisplayStart,
  allLanes,
  isJumping,
  globalCurrentIndex,
  jumpStartLane,
  blockedNextLane,
  carSprites,
}) {
  const [dynamicCars, setDynamicCars] = useState(new Map())
  const timersRef = useRef(new Map())

  // Helpers from config (memoized)
  const cfg = GAME_CONFIG

  const getMeanInterval = (lane) => {
    const arr = cfg.TRAFFIC?.MEAN_INTERVAL_MS_BY_LANE || []
    const idx = Math.min(Math.max(lane - 1, 0), arr.length - 1)
    const base = arr[idx] || cfg.CAR_SPEED.TRAFFIC_BASE_INTERVAL_MS
    const rateMul = cfg.TRAFFIC?.SPAWN_RATE_MULTIPLIER ?? 1.0
    return Math.max(1, base * rateMul)
  }

  const getSpeedForLane = (lane) => {
    const baseArr = cfg.CAR_SPEED?.LANE_SPEED_PATTERN_MS || [2400]
    const idx = Math.min(Math.max(lane - 1, 0), baseArr.length - 1)
    let base = baseArr[idx] || baseArr[baseArr.length - 1]
    const speedMul = cfg.CAR_SPEED?.SPEED_MULTIPLIER ?? 1.0
    base = base * speedMul
    const jitterPct = cfg.TRAFFIC?.SPEED_JITTER_PERCENT ?? 0
    const jitterFactor = 1 + ((Math.random() * 2 - 1) * jitterPct)
    const minSpeed = cfg.CAR_SPEED?.MIN_SPEED_MS ?? 600
    return Math.max(minSpeed, Math.round(base * jitterFactor))
  }

  const expRand = (mean) => {
    const u = Math.max(1e-6, Math.random())
    return Math.max(0, -Math.log(u) * mean)
  }

  // Visibility window (memoized)
  const visibleBounds = useMemo(() => {
    const buffer = cfg.TRAFFIC?.VISIBLE_BUFFER_LANES ?? 1
    const start = Math.max(1, globalDisplayStart - buffer)
    const end = Math.min(allLanes.length - 1, globalDisplayStart + remainingMultipliers.length - 1 + buffer)
    return { start, end }
  }, [cfg.TRAFFIC?.VISIBLE_BUFFER_LANES, globalDisplayStart, allLanes.length, remainingMultipliers.length])

  const isLaneBlockedNow = (lane) => {
    const referenceIndex = isJumping ? jumpStartLane : globalCurrentIndex
    const isCompleted = lane < referenceIndex
    const isCurrent = lane === referenceIndex
    const isServerBlockedNext = (lane === globalCurrentIndex + 1) && !!blockedNextLane
    return (lane > 0) && (isCompleted || isCurrent || isServerBlockedNext)
  }

  // Mark a specific car done so cleanup can prune it
  const markCarDone = (laneIndex, carId) => {
    setDynamicCars(prev => {
      const next = new Map(prev)
      const arr = next.get(laneIndex) || []
      next.set(laneIndex, arr.map(c => c.id === carId ? { ...c, done: true } : c))
      return next
    })
  }

  // Imperative helper: inject a one-shot car into a specific lane (e.g., to guarantee a crash visual)
  const addOneShotCar = (laneIndex, durationMs = 800) => {
    const now = Date.now()
    setDynamicCars(prev => {
      const next = new Map(prev)
      const arr = next.get(laneIndex) || []
      const pruned = arr.filter(c => !c.done)
      const carData = {
        id: `car-crash-${laneIndex}-${now}-${Math.floor(Math.random() * 1000)}`,
        isCrashLane: true,
        animationDuration: Math.max(300, durationMs),
        startTime: now,
        laneIndex,
        spriteSrc: carSprites[Math.floor(Math.random() * carSprites.length)],
      }
      next.set(laneIndex, [...pruned, carData])
      return next
    })
  }

  // Generator scheduler
  useEffect(() => {
    const timers = timersRef.current
    const { start: visibleStart, end: visibleEnd } = visibleBounds

    const headwayMin = cfg.TRAFFIC?.HEADWAY_MIN_PROGRESS ?? 0.35
    const headwayMinTimeFrac = cfg.TRAFFIC?.HEADWAY_MIN_TIME_FRACTION ?? 0
    const arrivalJitter = cfg.TRAFFIC?.ARRIVAL_JITTER_MS ?? 0
    const maxCarsVisible = cfg.TRAFFIC?.MAX_CARS_PER_LANE_VISIBLE ?? 3
    const minDelay = cfg.TRAFFIC?.MIN_DELAY_MS ?? 150
    const initialRange = cfg.TRAFFIC?.INITIAL_OFFSET_RANGE_MS || [200, 800]
    const perLaneEnabled = cfg.TRAFFIC?.PER_LANE_SPAWN_ENABLED || []
    const noOverlapStrict = cfg.TRAFFIC?.NO_OVERLAP_STRICT ?? false

    const scheduleNext = (lane) => {
      let delay = expRand(getMeanInterval(lane)) + (Math.random() * 2 - 1) * arrivalJitter
      delay = Math.max(minDelay, delay)
      const t = setTimeout(() => {
        setDynamicCars(prev => {
          const next = new Map(prev)
          const arr = next.get(lane) || []

          // Keep all cars unless explicitly done
          const now = Date.now()
          const pruned = arr.filter(c => !c.done)

          // Headway check against last active car
          const last = pruned[pruned.length - 1]
          if (last) {
            const progress = Math.max(0, Math.min(1, (now - last.startTime) / last.animationDuration))
            const elapsed = now - last.startTime
            const minGapMs = (last.animationDuration || 0) * headwayMinTimeFrac
            if (progress < headwayMin || elapsed < minGapMs) {
              scheduleNext(lane)
              next.set(lane, pruned)
              return next
            }
          }

          // When lane is blocked, allow at most one car so they don't stack at the blocker
          if (isLaneBlockedNow(lane) && pruned.length >= 1) {
            scheduleNext(lane)
            next.set(lane, pruned)
            return next
          }

          // Global strict no-overlap: keep at most one car per lane
          if (noOverlapStrict && pruned.length >= 1) {
            scheduleNext(lane)
            next.set(lane, pruned)
            return next
          }

          if (pruned.length >= maxCarsVisible) {
            scheduleNext(lane)
            next.set(lane, pruned)
            return next
          }

          const carData = {
            id: `car-${lane}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            isCrashLane: false,
            animationDuration: getSpeedForLane(lane),
            startTime: now,
            laneIndex: lane,
            spriteSrc: carSprites[Math.floor(Math.random() * carSprites.length)],
          }
          next.set(lane, [...pruned, carData])
          return next
        })

        scheduleNext(lane)
      }, delay)
      timers.set(`${lane}-${Date.now()}`, t)
    }

    // Kick off schedules for visible lanes
    for (let lane = visibleStart; lane <= visibleEnd; lane++) {
      const en = perLaneEnabled[lane - 1]
      if (typeof en === 'boolean' && !en) continue
      const [rmin, rmax] = initialRange
      const initial = Math.random() * (rmax - rmin) + rmin
      const t = setTimeout(() => scheduleNext(lane), initial)
      timers.set(`init-${lane}`, t)
    }

    // Seed: ensure at least one car is present per visible lane to avoid long empty periods
    const shouldSeed = cfg.TRAFFIC?.SEED_VISIBLE_LANES
    if (shouldSeed === undefined || shouldSeed === true) {
      setDynamicCars(prev => {
        const next = new Map(prev)
        const now = Date.now()
        for (let lane = visibleStart; lane <= visibleEnd; lane++) {
          const en = perLaneEnabled[lane - 1]
          if (typeof en === 'boolean' && !en) continue
          const arr = next.get(lane) || []
          const pruned = arr.filter(c => !c.done)
          if (pruned.length === 0) {
            const carData = {
              id: `car-seed-${lane}-${now}-${Math.floor(Math.random() * 1000)}`,
              isCrashLane: false,
              animationDuration: getSpeedForLane(lane),
              startTime: now,
              laneIndex: lane,
              spriteSrc: carSprites[Math.floor(Math.random() * carSprites.length)],
            }
            next.set(lane, [carData])
          } else {
            next.set(lane, pruned)
          }
        }
        return next
      })
    }

    return () => {
      timers.forEach(clearTimeout)
      timers.clear()
    }
  }, [visibleBounds.start, visibleBounds.end, cfg, remainingMultipliers.length, isJumping, globalCurrentIndex, jumpStartLane, blockedNextLane, carSprites])

  // Periodic cleanup of finished cars only (do NOT time-prune active/paused cars)
  useEffect(() => {
    const intervalMs = cfg.TRAFFIC?.CLEANUP_INTERVAL_MS ?? 800
    const cleanup = setInterval(() => {
      setDynamicCars(prev => {
        const next = new Map(prev)
        let changed = false
        next.forEach((arr, lane) => {
          const pruned = (arr || []).filter(c => !c.done)
          if (pruned.length !== (arr || []).length) {
            next.set(lane, pruned)
            changed = true
          }
        })
        return changed ? next : prev
      })
    }, intervalMs)
    return () => clearInterval(cleanup)
  }, [cfg.TRAFFIC?.CLEANUP_INTERVAL_MS])

  return { dynamicCars, markCarDone, addOneShotCar }
}
