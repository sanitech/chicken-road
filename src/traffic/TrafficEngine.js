// Singleton TrafficEngine that runs outside React to manage traffic continuously
// across the entire game. It randomizes once, manages timers, and survives UI re-renders.

export class TrafficEngine {
  static _instance = null

  static getInstance() {
    if (!TrafficEngine._instance) {
      TrafficEngine._instance = new TrafficEngine()
    }
    return TrafficEngine._instance
  }

  constructor() {
    this.started = false
    this.cfg = null
    this.laneCount = 0
    this.carSprites = []
    this.cars = new Map() // Map<laneIndex, CarData[]>
    this.timers = new Map() // Map<string, number>
    this.subscribers = new Set()
    this.noOverlapStrict = false
    this.blockedLanes = new Set() // lanes where regular spawns are suppressed
    this.blockerByLane = new Map() // Map<laneIndex, carId> of the active blocker car
  }

  init({ laneCount, cfg, carSprites }) {
    this.cfg = cfg
    this.laneCount = laneCount
    this.carSprites = carSprites || []
    this.noOverlapStrict = !!(cfg?.TRAFFIC?.NO_OVERLAP_STRICT)
    this.blockedLanes.clear()
    this.blockerByLane.clear()

    // Initialize lanes
    for (let lane = 1; lane <= laneCount; lane++) {
      if (!this.cars.has(lane)) this.cars.set(lane, [])
    }
  }

  start() {
    if (this.started) return
    this.started = true

    const perLaneEnabled = this.cfg?.TRAFFIC?.PER_LANE_SPAWN_ENABLED || []
    const initialRange = this.cfg?.TRAFFIC?.INITIAL_OFFSET_RANGE_MS || [200, 800]
    const [rmin, rmax] = initialRange

    for (let lane = 1; lane <= this.laneCount; lane++) {
      const en = perLaneEnabled[lane - 1]
      if (typeof en === 'boolean' && !en) continue
      // Do NOT seed immediately; schedule the first randomized arrival only
      const initial = Math.random() * (rmax - rmin) + rmin
      const t = setTimeout(() => this._scheduleNext(lane), initial)
      this.timers.set(`init-${lane}-${Date.now()}`, t)
    }

    // Cleanup interval for done cars only
    const cleanupInterval = this.cfg?.TRAFFIC?.CLEANUP_INTERVAL_MS ?? 800
    const cleanup = setInterval(() => this._cleanupDone(), cleanupInterval)
    this.timers.set('cleanup', cleanup)
  }

  stop() {
    this.timers.forEach(clearTimeout)
    this.timers.clear()
    this.started = false
  }

  reset() {
    this.stop()
    this.cars = new Map()
  }

  // Clear all cars from all lanes without stopping timers (used on game restart)
  clearAllCars() {
    for (let lane = 1; lane <= this.laneCount; lane++) {
      this.cars.set(lane, [])
    }
    this.blockedLanes.clear()
    this.blockerByLane.clear()
    this._emit()
  }

  // Control whether a lane should suppress future regular spawns
  // STRICT RULE: Cancel pending timers to prevent race conditions
  setLaneBlocked(laneIndex, isBlocked) {
    if (isBlocked) {
      this.blockedLanes.add(laneIndex)
      
      // Cancel all pending spawn timers for this lane to prevent race conditions
      // This stops any scheduled _scheduleNext() calls from firing
      this.timers.forEach((timerId, key) => {
        if (key.startsWith(`lane-${laneIndex}-`)) {
          clearTimeout(timerId)
          this.timers.delete(key)
        }
      })
      
      // DO NOT remove existing cars - let them finish their animation naturally
      // The blocking only prevents NEW spawns
      console.log(`[TrafficEngine] Lane ${laneIndex} blocked - canceled pending timers, existing cars will finish naturally`)
    } else {
      this.blockedLanes.delete(laneIndex)
      this.blockerByLane.delete(laneIndex)
      
      // Restart spawn cycle for this lane after unblocking
      this._reschedule(laneIndex)
      
      console.log(`[TrafficEngine] Lane ${laneIndex} unblocked - resumed spawning`)
    }
  }

  subscribe(cb) {
    this.subscribers.add(cb)
    // Push current snapshot
    cb(this._snapshot())
    return () => this.subscribers.delete(cb)
  }

  _emit() {
    const snap = this._snapshot()
    this.subscribers.forEach((cb) => {
      try { cb(snap) } catch {}
    })
  }

  _snapshot() {
    // Shallow clone arrays so UI cannot mutate internal state
    const out = new Map()
    this.cars.forEach((arr, lane) => out.set(lane, arr.slice()))
    return { cars: out }
  }

  // Read-only helper for external logic: get active (not done) cars for a lane
  getCarsForLane(laneIndex) {
    const arr = this.cars.get(laneIndex) || []
    return arr.filter(c => !c.done).map(c => ({ ...c }))
  }

  markDone(laneIndex, carId) {
    const arr = this.cars.get(laneIndex) || []
    this.cars.set(laneIndex, arr.map(c => c.id === carId ? { ...c, done: true } : c))
    this._emit()
  }

  injectCrashCar(laneIndex, durationMs = null) {
    const defaultDuration = this.cfg?.CRASH?.DURATION_MS ?? 900
    const finalDuration = durationMs ?? defaultDuration
    const now = Date.now()
    const arr = this.cars.get(laneIndex) || []
    const pruned = arr.filter(c => !c.done)
    
    // CLEAN APPROACH: By this point, the lane should be empty (we waited)
    // Just spawn a new crash car without clearing anything
    console.log(`[TrafficEngine] Injecting crash car in lane ${laneIndex}, current car count: ${pruned.length}`)
    
    const crashCar = {
      id: `car-crash-${laneIndex}-${now}-${Math.floor(Math.random() * 1000)}`,
      isCrashLane: true,
      animationDuration: Math.max(300, finalDuration),
      startTime: now,
      laneIndex,
      spriteSrc: this._randomSprite()
    }
    
    // Keep existing cars (should be none, but if any exist let them finish naturally)
    this.cars.set(laneIndex, [...pruned, crashCar])
    this._emit()
  }

  _randomSprite() {
    if (!this.carSprites?.length) return undefined
    return this.carSprites[Math.floor(Math.random() * this.carSprites.length)]
  }

  _getMeanInterval(lane) {
    const cfg = this.cfg
    const arr = cfg?.TRAFFIC?.MEAN_INTERVAL_MS_BY_LANE || []
    const idx = Math.min(Math.max(lane - 1, 0), arr.length - 1)
    const base = arr[idx] || cfg?.CAR_SPEED?.TRAFFIC_BASE_INTERVAL_MS || 2200
    const rateMul = cfg?.TRAFFIC?.SPAWN_RATE_MULTIPLIER ?? 1.0
    return Math.max(1, base * rateMul)
  }

  _getSpeedForLane(lane) {
    const cfg = this.cfg
    const baseArr = cfg?.CAR_SPEED?.LANE_SPEED_PATTERN_MS || [2400]
    const idx = Math.min(Math.max(lane - 1, 0), baseArr.length - 1)
    let base = baseArr[idx] || baseArr[baseArr.length - 1]
    const speedMul = cfg?.CAR_SPEED?.SPEED_MULTIPLIER ?? 1.0
    base = base * speedMul
    const jitterPct = cfg?.TRAFFIC?.SPEED_JITTER_PERCENT ?? 0
    const jitterFactor = 1 + ((Math.random() * 2 - 1) * jitterPct)
    const minSpeed = cfg?.CAR_SPEED?.MIN_SPEED_MS ?? 600
    const maxSpeed = cfg?.CAR_SPEED?.MAX_SPEED_MS ?? Infinity
    const raw = Math.round(base * jitterFactor)
    // Clamp to avoid too-fast or too-slow extremes
    return Math.min(maxSpeed, Math.max(minSpeed, raw))
  }

  _expRand(mean) {
    const u = Math.max(1e-6, Math.random())
    return Math.max(0, -Math.log(u) * mean)
  }

  _cleanupDone() {
    let changed = false
    this.cars.forEach((arr, lane) => {
      const pruned = (arr || []).filter(c => !c.done)
      if (pruned.length !== (arr || []).length) {
        this.cars.set(lane, pruned)
        changed = true
      }
    })
    if (changed) this._emit()
  }

  _seedLaneIfEmpty(lane) {
    const arr = this.cars.get(lane) || []
    const pruned = arr.filter(c => !c.done)
    if (pruned.length === 0) {
      const now = Date.now()
      const carData = {
        id: `car-seed-${lane}-${now}-${Math.floor(Math.random() * 1000)}`,
        isCrashLane: false,
        animationDuration: this._getSpeedForLane(lane),
        startTime: now,
        laneIndex: lane,
        spriteSrc: this._randomSprite(),
      }
      this.cars.set(lane, [carData])
    }
  }

  _scheduleNext(lane) {
    const cfg = this.cfg
    const headwayMin = cfg?.TRAFFIC?.HEADWAY_MIN_PROGRESS ?? 0.35
    const headwayMinTimeFrac = cfg?.TRAFFIC?.HEADWAY_MIN_TIME_FRACTION ?? 0
    const arrivalJitter = cfg?.TRAFFIC?.ARRIVAL_JITTER_MS ?? 0
    const maxCarsVisible = cfg?.TRAFFIC?.MAX_CARS_PER_LANE_VISIBLE ?? 3

    // Prune done
    const now = Date.now()
    const arr = this.cars.get(lane) || []
    const pruned = arr.filter(c => !c.done)

    // Headway
    const last = pruned[pruned.length - 1]
    if (last) {
      const progress = Math.max(0, Math.min(1, (now - last.startTime) / last.animationDuration))
      const elapsed = now - last.startTime
      const minGapMs = (last.animationDuration || 0) * headwayMinTimeFrac
      if (progress < headwayMin || elapsed < minGapMs) {
        this._reschedule(lane)
        this.cars.set(lane, pruned)
        return
      }
    }

    if (this.noOverlapStrict && pruned.length >= 1) {
      this._reschedule(lane)
      this.cars.set(lane, pruned)
      return
    }

    if (pruned.length >= maxCarsVisible) {
      this._reschedule(lane)
      this.cars.set(lane, pruned)
      return
    }

    // If lane is currently blocked, suppress spawning new regular cars
    if (this.blockedLanes.has(lane)) {
      this._reschedule(lane)
      this.cars.set(lane, pruned)
      return
    }

    const carData = {
      id: `car-${lane}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      isCrashLane: false,
      animationDuration: this._getSpeedForLane(lane),
      startTime: Date.now(),
      laneIndex: lane,
      spriteSrc: this._randomSprite(),
    }
    this.cars.set(lane, [...pruned, carData])
    this._emit()

    this._reschedule(lane)
  }
  // Public API: Inject a blocked showcase car that stops at the stop point
  injectBlockedCar(laneIndex, durationMs = 800) {
    // Skip if a blocker is already present for this lane (via promotion or prior inject)
    if (this.blockerByLane.has(laneIndex)) return
    const now = Date.now()
    const arr = this.cars.get(laneIndex) || []
    const pruned = arr.filter(c => !c.done)
    const carData = {
      id: `car-blocked-${laneIndex}-${now}-${Math.floor(Math.random() * 1000)}`,
      isCrashLane: false,
      isBlockedShowcase: true,
      animationDuration: Math.max(200, durationMs),
      startTime: now,
      laneIndex: laneIndex,
      spriteSrc: this._randomSprite(),
    }
    this.cars.set(laneIndex, [...pruned, carData])
    // Record this as the active blocker
    this.blockerByLane.set(laneIndex, carData.id)
    this._emit()
  }

  // Helper: should we spawn a blocked showcase car for this lane?
  // STRICT RULE: Only spawn if lane is completely empty
  maybeSpawnBlockedShowcase(laneIndex) {
    const p = this.cfg?.TRAFFIC?.BLOCKED_SHOWCASE?.PROBABILITY_PER_BLOCK ?? 0
    if (p <= 0) return
    if (this.blockerByLane.has(laneIndex)) return // Already has blocker
    
    // NEW: Check if lane has ANY active cars before spawning
    const arr = this.cars.get(laneIndex) || []
    const activeCars = arr.filter(c => !c.done)
    if (activeCars.length > 0) {
      console.log(`[TrafficEngine] Lane ${laneIndex} has ${activeCars.length} active car(s), skipping showcase blocker spawn`)
      return // Don't spawn if lane is occupied
    }
    
    // Roll dice for probabilistic spawn
    if (Math.random() < p) {
      console.log(`[TrafficEngine] Spawning showcase blocker in empty lane ${laneIndex}`)
      this.injectBlockedCar(laneIndex)
    }
  }

  _reschedule(lane) {
    const delay = Math.max(
      this.cfg?.TRAFFIC?.MIN_DELAY_MS ?? 150,
      this._expRand(this._getMeanInterval(lane)) + (Math.random() * 2 - 1) * (this.cfg?.TRAFFIC?.ARRIVAL_JITTER_MS ?? 0)
    )
    const t = setTimeout(() => this._scheduleNext(lane), delay)
    this.timers.set(`lane-${lane}-${Date.now()}`, t)
  }
}

export default TrafficEngine.getInstance()
