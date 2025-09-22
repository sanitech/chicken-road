import React, { useState, useEffect, useRef } from 'react'
import cap1Image from '../assets/cap1.png'
import cap2Image from '../assets/cap2.png'
import blockerImage from '../assets/blocker.png'
import sideRoadImage from '../assets/sideroad.png'
import finalSideRoadImage from '../assets/final.png'
import crashAudio from '../assets/audio/crash.6d250f25.mp3'
import Chicken from './Chicken'
import Car from './Car'
import car1 from '../assets/car1.png'
import car2 from '../assets/car2.png'
import car3 from '../assets/car3.png'
import { GAME_CONFIG } from '../utils/gameConfig'

// Smart Car Component with chicken collision detection and pause system
function DynamicCar({ carData, hasBlocker, pauseForBlocker = false, onAnimationComplete, isChickenJumping, chickenTargetLane, isReservationActive = false, reservationDecision = 'pause', cutoff = 0.6 }) {
    const [carState, setCarState] = useState('waiting') // waiting -> moving -> paused -> stopped -> gone
    const [hasPlayedCrashAudio, setHasPlayedCrashAudio] = useState(false) // Track if audio already played
    const [pausedByReservation, setPausedByReservation] = useState(false)
    const wrapperRef = useRef(null)

    // Play crash audio when car hits blocker - only once
    const playCrashAudio = () => {
        if (!hasPlayedCrashAudio) {
            try {
                const audio = new Audio(crashAudio)
                audio.volume = 0.3 // Lower volume for better UX
                audio.play().catch(e => console.log('Audio play failed:', e))
                setHasPlayedCrashAudio(true) // Mark as played
                console.log('Crash audio played for car in lane', carData.laneIndex)
            } catch (error) {
                console.log('Audio not available:', error)
            }
        }
    }

    useEffect(() => {
        // Start immediately (no artificial delay)
        setCarState('moving')

        // JS-controlled decelerating stop when blocker is present (reservation or base/server blockers)
        if (hasBlocker) {
            const el = wrapperRef.current
            if (!el) return
            // Find the lane column (absolute parent) to compute heights
            const laneEl = el.parentElement
            if (!laneEl) return
            const laneHeight = laneEl.clientHeight

            // Target: STOP_TOP_PERCENT of the lane height (e.g., 20%)
            const stopTopPercent = GAME_CONFIG.CAR?.STOP_TOP_PERCENT ?? 20
            const targetTop = (laneHeight * (stopTopPercent / 100)) - (GAME_CONFIG.CAR.SIZE_PX * 0.5)

            // Starting top in px (current style top), default to spawn offset if not set
            const spawnOffset = -(GAME_CONFIG.CAR.SPAWN_TOP_OFFSET_PX || 0)
            const startTop = typeof el.style.top === 'string' && el.style.top.endsWith('px')
                ? parseFloat(el.style.top)
                : spawnOffset

            const duration = Math.min(900, Math.max(400, carData.animationDuration * 0.4))
            const startTime = performance.now()

            const easeOutCubic = t => 1 - Math.pow(1 - t, 3)

            const step = (now) => {
                const t = Math.min(1, (now - startTime) / duration)
                const eased = easeOutCubic(t)
                const y = startTop + (targetTop - startTop) * eased
                el.style.top = `${y}px`
                if (t < 1) {
                    requestAnimationFrame(step)
                } else {
                    // Reached stop point under blocker
                    setCarState('paused')
                    // Play crash audio once
                    try { playCrashAudio() } catch {}

                    // If not reservation-controlled, optionally remove after some time
                    if (!isReservationActive) {
                        const timer = setTimeout(() => setCarState('gone'), Math.max(600, carData.animationDuration))
                        return () => clearTimeout(timer)
                    }
                }
            }
            requestAnimationFrame(step)
        }

        return () => { /* no-op cleanup */ }
    }, [carData.id, carData.animationDuration, hasBlocker, isReservationActive])

    // Resume movement automatically when reservation ends
    useEffect(() => {
        if (!isReservationActive && pausedByReservation) {
            setCarState('moving')
        }
    }, [isReservationActive, pausedByReservation])

    if (carState === 'waiting' || carState === 'gone') return null

    return (
        <div 
            ref={wrapperRef}
            className="absolute left-1/2"
            style={{
                // Start above the lane area so cars appear from behind the header
                top: `-${GAME_CONFIG.CAR.SPAWN_TOP_OFFSET_PX || 0}px`,
                transform: 'translateX(-50%)',
                // Dynamic animation speed based on car data
                '--car-animation-duration': `${carData.animationDuration}ms`,
                // Ensure cars render above cap/blocker (z-2/3) but below chicken (z-10)
                zIndex: 5
            }}
        >
            <Car
                isAnimating={!hasBlocker && carState === 'moving'}
                isContinuous={!hasBlocker && carState !== 'paused'} // No CSS movement when blocked; we drive via JS
                onAnimationComplete={() => { }} // Handled by timer above
                customSpeed={carData.animationDuration}
                isBlocked={carState === 'stopped'}
                isPaused={carState === 'paused'}
                spriteSrc={carData.spriteSrc}
            />
        </div>
    )
}

function Lane({ remainingMultipliers, currentIndex, globalCurrentIndex, globalDisplayStart, allLanes, isDead = false, shouldAnimateCar = false, gameEnded = false, isJumping = false, jumpProgress = 0, jumpStartLane = 0, jumpTargetLane = 0, isRestarting = false, blockedNextLane = false }) {
    const [carAnimationState, setCarAnimationState] = useState({
        isAnimating: false,
        hasCompleted: false
    })

    // Dynamic car generation state
    // Map<laneIndex, CarData[]> where CarData includes id, startTime, animationDuration, laneIndex, spriteSrc
    const [dynamicCars, setDynamicCars] = useState(new Map())

    // Latch the reservation decision AFTER landing (so visuals appear post-landing)
    // Structure: { active: boolean, targetLane: number, decision: 'pause' | 'pass' }
    const reservationRef = useRef({ active: false, targetLane: -1, decision: 'pause' })
    const prevIsJumpingRef = useRef(isJumping)

    useEffect(() => {
        const prev = prevIsJumpingRef.current
        prevIsJumpingRef.current = isJumping

        // Detect landing: was jumping, now not jumping
        if (prev && !isJumping) {
            const target = jumpTargetLane
            let decision = 'pause'
            const car = dynamicCars.get(target)
            if (car) {
                const now = Date.now()
                const progress = Math.max(0, Math.min(1, (now - car.startTime) / car.animationDuration))
                // If already beyond cutoff, let it pass
                if (progress >= GAME_CONFIG.BLOCKER.STOP_CUTOFF_PROGRESS) {
                    decision = 'pass'
                }
            } else {
                // No car yet → if one appears after landing, pause it at blocker
                decision = 'pause'
            }
            reservationRef.current = { active: true, targetLane: target, decision }

            // Do not synthesize a car; if none exists, blocker will show but cars come via traffic generator
        }

        // When a new jump starts, clear previous reservation visuals
        if (!prev && isJumping) {
            reservationRef.current = { active: false, targetLane: -1, decision: 'pause' }
        }
    }, [isJumping, jumpTargetLane, dynamicCars])

    // Realistic stochastic car generation with per-lane Poisson arrivals and speed jitter
    useEffect(() => {
        const timers = new Map()

        const carSprites = [car1, car2, car3]

        const expRand = (mean) => {
            const u = Math.max(1e-6, Math.random())
            return Math.max(0, -Math.log(u) * mean)
        }

        const getMeanInterval = (lane) => {
            const arr = GAME_CONFIG.TRAFFIC?.MEAN_INTERVAL_MS_BY_LANE || []
            const idx = Math.min(Math.max(lane - 1, 0), arr.length - 1)
            const base = arr[idx] || GAME_CONFIG.CAR_SPEED.TRAFFIC_BASE_INTERVAL_MS
            const rateMul = GAME_CONFIG.TRAFFIC?.SPAWN_RATE_MULTIPLIER ?? 1.0
            return Math.max(1, base * rateMul)
        }

        const getSpeedForLane = (lane) => {
            const baseArr = GAME_CONFIG.CAR_SPEED?.LANE_SPEED_PATTERN_MS || [2400]
            const idx = Math.min(Math.max(lane - 1, 0), baseArr.length - 1)
            let base = baseArr[idx] || baseArr[baseArr.length - 1]
            const speedMul = GAME_CONFIG.CAR_SPEED?.SPEED_MULTIPLIER ?? 1.0
            base = base * speedMul
            const jitterPct = GAME_CONFIG.TRAFFIC?.SPEED_JITTER_PERCENT ?? 0
            const jitterFactor = 1 + ((Math.random() * 2 - 1) * jitterPct)
            const minSpeed = GAME_CONFIG.CAR_SPEED?.MIN_SPEED_MS ?? 600
            return Math.max(minSpeed, Math.round(base * jitterFactor))
        }

        const headwayMin = GAME_CONFIG.TRAFFIC?.HEADWAY_MIN_PROGRESS ?? 0.35
        const headwayMinTimeFrac = GAME_CONFIG.TRAFFIC?.HEADWAY_MIN_TIME_FRACTION ?? 0
        const arrivalJitter = GAME_CONFIG.TRAFFIC?.ARRIVAL_JITTER_MS ?? 0
        const maxCarsVisible = GAME_CONFIG.TRAFFIC?.MAX_CARS_PER_LANE_VISIBLE ?? 3
        const buffer = GAME_CONFIG.TRAFFIC?.VISIBLE_BUFFER_LANES ?? 1
        const minDelay = GAME_CONFIG.TRAFFIC?.MIN_DELAY_MS ?? 150
        const initialRange = GAME_CONFIG.TRAFFIC?.INITIAL_OFFSET_RANGE_MS || [200, 800]
        const perLaneEnabled = GAME_CONFIG.TRAFFIC?.PER_LANE_SPAWN_ENABLED || []
        const noOverlapStrict = GAME_CONFIG.TRAFFIC?.NO_OVERLAP_STRICT ?? false

        const visibleStart = Math.max(1, globalDisplayStart - buffer)
        const visibleEnd = Math.min(allLanes.length - 1, globalDisplayStart + remainingMultipliers.length - 1 + buffer)

        const isLaneBlockedNow = (lane) => {
            const referenceIndex = isJumping ? jumpStartLane : globalCurrentIndex
            const isCompleted = lane < referenceIndex
            const isCurrent = lane === referenceIndex
            const isServerBlockedNext = (lane === globalCurrentIndex + 1) && !!blockedNextLane
            const isReservationLane = reservationRef.current.active && reservationRef.current.targetLane === lane && reservationRef.current.decision === 'pause'
            return (lane > 0) && (isCompleted || isCurrent || isServerBlockedNext || isReservationLane)
        }

        const scheduleNext = (lane) => {
            let delay = expRand(getMeanInterval(lane)) + (Math.random() * 2 - 1) * arrivalJitter
            delay = Math.max(minDelay, delay)
            const t = setTimeout(() => {
                setDynamicCars(prev => {
                    const next = new Map(prev)
                    const arr = next.get(lane) || []

                    // Prune old cars by time to keep array fresh
                    const now = Date.now()
                    const pruned = arr.filter(c => (now - c.startTime) <= (c.animationDuration + 50))

                    // Headway check against last active car
                    const last = pruned[pruned.length - 1]
                    if (last) {
                        const progress = Math.max(0, Math.min(1, (now - last.startTime) / last.animationDuration))
                        const elapsed = now - last.startTime
                        const minGapMs = (last.animationDuration || 0) * headwayMinTimeFrac
                        if (progress < headwayMin || elapsed < minGapMs) {
                            // reschedule and keep previous state
                            scheduleNext(lane)
                            next.set(lane, pruned)
                            return next
                        }
                    }

                    // When lane is blocked (by server or base), allow at most one car so they don't stack at the blocker
                    if (isLaneBlockedNow(lane) && pruned.length >= 1) {
                        scheduleNext(lane)
                        next.set(lane, pruned)
                        return next
                    }

                    // Global strict no-overlap: when enabled, keep at most one car per lane at any time
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
                        id: `car-${lane}-${Date.now()}-${Math.floor(Math.random()*1000)}`,
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

        for (let lane = visibleStart; lane <= visibleEnd; lane++) {
            // Respect per-lane enable flags if provided
            const en = perLaneEnabled[lane - 1]
            if (typeof en === 'boolean' && !en) continue
            // Kick off with a small random initial offset so lanes are out of phase
            const [rmin, rmax] = initialRange
            const initial = Math.random() * (rmax - rmin) + rmin
            const t = setTimeout(() => scheduleNext(lane), initial)
            timers.set(`init-${lane}`, t)
        }

        return () => {
            timers.forEach(clearTimeout)
            timers.clear()
        }
    }, [remainingMultipliers, globalDisplayStart, allLanes.length, isJumping, globalCurrentIndex, jumpStartLane, blockedNextLane])

    // Periodic cleanup of finished cars so arrays don't block new spawns
    useEffect(() => {
        const intervalMs = GAME_CONFIG.TRAFFIC?.CLEANUP_INTERVAL_MS ?? 800
        const cleanup = setInterval(() => {
            setDynamicCars(prev => {
                const next = new Map(prev)
                let changed = false
                const now = Date.now()
                next.forEach((arr, lane) => {
                    const pruned = (arr || []).filter(c => {
                        // If marked done by animationend, remove
                        if (c.done) return false
                        // Otherwise keep generously to avoid premature pruning (allow pauses)
                        return (now - c.startTime) <= (c.animationDuration * 3)
                    })
                    if (pruned.length !== (arr || []).length) {
                        next.set(lane, pruned)
                        changed = true
                    }
                })
                return changed ? next : prev
            })
        }, intervalMs)
        return () => clearInterval(cleanup)
    }, [])

    // Trigger car animation when chicken reaches crash position
    useEffect(() => {
        if (shouldAnimateCar && !carAnimationState.hasCompleted) {
            setCarAnimationState({
                isAnimating: true,
                hasCompleted: false
            })
        }
    }, [shouldAnimateCar, carAnimationState.hasCompleted])

    const handleCarAnimationComplete = () => {
        setCarAnimationState({
            isAnimating: false,
            hasCompleted: true
        })
    }

    // Calculate chicken position - starts from side road
    const getChickenPosition = () => {
        // Chicken position based on current lane
        const isAtStart = globalCurrentIndex === 0

        // Helper: compute chicken left value based on config
        const getConfiguredLeft = () => {
            if (GAME_CONFIG.CHICKEN_X_MODE === 'fixed_px') {
                return `${GAME_CONFIG.CHICKEN_FIXED_X_PX}px`
            }
            if (GAME_CONFIG.CHICKEN_X_MODE === 'percent') {
                return `${GAME_CONFIG.CHICKEN_LEFT_PERCENT}%`
            }
            // 'boundary' -> align with sidewalk/lane-1 seam in px
            return `${LANE_WIDTH_PX}px`
        }

        // Handle restart animation - smooth transition back to configured X position
        if (isRestarting) {
            return {
                left: getConfiguredLeft(),
                top: `${GAME_CONFIG.CHICKEN_TOP_PERCENT}%`,
                transform: 'translate(-50%, -50%)',
                transition: 'all 1s ease-in-out' // Smooth 1-second animation
            }
        }

        if (!isJumping) {
            return {
                left: getConfiguredLeft(),
                top: `${GAME_CONFIG.CHICKEN_TOP_PERCENT}%`,
                transform: 'translate(-50%, -50%)'
            }
        }

        // During jump: slight upward projection only (small vertical movement, no rotate/scale)
        const maxLiftPx = 50
        const lift = Math.sin(jumpProgress * Math.PI) * maxLiftPx
        const verticalOffset = -lift // negative to move up

        return {
            left: getConfiguredLeft(),
            top: `${GAME_CONFIG.CHICKEN_TOP_PERCENT}%`,
            transform: `translate(-50%, calc(-50% + ${verticalOffset}px))`,
            transition: 'none',
            zIndex: 10
        }
    }

    // Lane movement system - start parallax from the beginning (no initial offset)
    // Offset is simply based on how many lanes have been progressed within the current window.
    const getBackgroundOffset = (layer = 'main') => {
        const layerSpeeds = {
            main: 1.0
        }

        const currentWithinWindow = Math.max(0, Math.min(remainingMultipliers.length, globalCurrentIndex - globalDisplayStart))

        const easedProgress = isJumping
            ? (jumpProgress < 0.5
                ? 2 * jumpProgress * jumpProgress
                : 1 - Math.pow(-2 * jumpProgress + 2, 2) / 2)
            : 0

        // Move the strip left by PARALLAX.STEP_PX per lane of progress; at start => 0px
        const virtualIndex = currentWithinWindow + easedProgress
        const offsetPx = -(virtualIndex * GAME_CONFIG.PARALLAX.STEP_PX)

        const layerSpeed = layerSpeeds.main
        const totalPx = Math.round(offsetPx * layerSpeed)
        
        return {
            transform: `translateX(${totalPx}px)`,
            transition: 'none'
        }
    }

    // Helpers
    const isTrafficLane = (idx) => idx >= 1 && idx <= allLanes.length

    // Determine which lanes should show cars - realistic logic
    const shouldShowCarInLane = (globalIndex) => {
        if (!isTrafficLane(globalIndex)) return false
        const isCurrentLane = globalIndex === globalCurrentIndex
        const isNextLane = globalIndex === globalCurrentIndex + 1 // Next lane where chicken will jump to
        const isPassedLane = globalIndex < globalCurrentIndex // Lanes chicken has already passed
        const hasBlocker = ((globalIndex < globalCurrentIndex && globalIndex > 0) || (globalIndex === globalCurrentIndex && globalIndex > 0))

        // Don't generate cars in:
        // 1. Lanes chicken has passed (realistic - no traffic behind)
        // 2. Current lane (chicken is there)
        // 3. Next lane (for crash determination)
        // 4. Lane 0 (starting position)
        // Reserve the target lane during the jump
        const isReservedJumpTarget = isJumping && globalIndex === jumpTargetLane

        if (isPassedLane || isCurrentLane || isNextLane || isReservedJumpTarget || globalIndex === 0) {
            return false
        }

        // Server handles crash detection - no special crash lane logic needed

        return true
    }

    // Widths from central config
    const LANE_WIDTH_PX = GAME_CONFIG.LANE_WIDTH_PX
    const SIDEWALK_WIDTH_PX = GAME_CONFIG.SIDEWALK_WIDTH_PX
    const FINAL_SIDEWALK_WIDTH_PX = GAME_CONFIG.FINAL_SIDEWALK_WIDTH_PX
    
    return (
        <div
            className=""
        >
            {/* Lane markers/segments - main movement */}
            <div
                className="absolute flex"
                style={{
                    background: `linear-gradient(to right, #716C69, #635E5A)`,
                    filter: isJumping ? `blur(${jumpProgress * 1}px)` : 'none',
                    opacity: 0.9,
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${SIDEWALK_WIDTH_PX + (remainingMultipliers.length * LANE_WIDTH_PX)}px`,
                    ...getBackgroundOffset('main'),
                    transition: 'none',
                    zIndex: 2
                }}
            >
                {Array.from({ length: remainingMultipliers.length + 1 }).map((_, index) => {
                    const globalIndex = globalDisplayStart + index
                    // During jumps, use the start position to prevent lane state flickering
                    const referenceIndex = isJumping ? jumpStartLane : globalCurrentIndex
                    const isCompleted = globalIndex < referenceIndex
                    const isCurrent = globalIndex === referenceIndex
                    const isFuture = globalIndex > referenceIndex

                    // Compute hasBlocker for this lane (prevents cars entering/stops cars)
                    const baseBlocked = ((isCompleted && globalIndex > 0) || (isCurrent && globalIndex > 0))
                    const isBlockedByServer = (globalIndex === globalCurrentIndex + 1) && !!blockedNextLane
                    const isReservationLane = reservationRef.current.active && reservationRef.current.targetLane === globalIndex
                    const computedHasBlocker = baseBlocked || (isReservationLane && reservationRef.current.decision === 'pause') || isBlockedByServer

                    return (
                        <div
                            key={globalIndex}
                            className={`relative ${globalIndex > 0 ? 'flex items-end pb-52' : ''}`}
                            style={{ width: `${globalIndex === 0 ? SIDEWALK_WIDTH_PX : LANE_WIDTH_PX}px` }}
                        >
                            {/* Side Road Image Element - Full Control */}
                            {globalIndex === 0 && (
                                <img
                                    src={sideRoadImage}
                                    alt="Side Road"
                                    className="w-full h-full object-cover"
                                    style={{
                                        objectPosition: 'bottom center',
                                        zIndex: 1
                                    }}
                                />
                            )}

                            {/* Final side road will be rendered outside the last lane */}

                            {globalIndex > 0 && (
                                <>
                                    {/* Absolutely positioned lane cap tied to TOP_PERCENT */}
                                    <div
                                        className="absolute left-1/2 -translate-x-1/2 p-4"
                                        style={{
                                            top: `${GAME_CONFIG.CAP.TOP_PERCENT}%`,
                                            transform: 'translate(-50%, -50%)',
                                            zIndex: 2,
                                            width: '100%',
                                            pointerEvents: 'none'
                                        }}
                                    >
                                        <img
                                            src={cap1Image}
                                            alt="Lane Cap"
                                            className="mx-auto object-contain"
                                            style={{ 
                                                objectPosition: GAME_CONFIG.CAP.OBJECT_POSITION,
                                                width: `${GAME_CONFIG.CAP.SIZE_PX}px`,
                                                height: `${GAME_CONFIG.CAP.SIZE_PX}px`
                                            }}
                                        />
                                    </div>

                                    {/* Multiplier overlay centered on cap */}
                                    {
                                        <div className="absolute left-1/2 -translate-x-1/2"
                                            style={{ top: `${GAME_CONFIG.CAP.TOP_PERCENT}%`, transform: 'translate(-50%, -50%)', zIndex: 3 }}>
                                            <span className="text-white font-bold text-lg">
                                                {allLanes[globalIndex - 1]?.toFixed(2)}x
                                            </span>
                                        </div>
                                    }
                                </>
                            )}

                            {/* Smart car for this specific lane - with chicken collision detection */}
                            {(dynamicCars.get(globalIndex) || []).map(carData => (
                                <DynamicCar
                                    key={carData.id}
                                    carData={carData}
                                    hasBlocker={computedHasBlocker}
                                    pauseForBlocker={isBlockedByServer}
                                    isReservationActive={reservationRef.current.active && reservationRef.current.targetLane === globalIndex}
                                    reservationDecision={reservationRef.current.decision}
                                    cutoff={GAME_CONFIG.BLOCKER.STOP_CUTOFF_PROGRESS}
                                    onAnimationComplete={() => {
                                        // Mark car as done so cleanup can prune it
                                        setDynamicCars(prev => {
                                            const next = new Map(prev)
                                            const arr = next.get(globalIndex) || []
                                            next.set(globalIndex, arr.map(c => c.id === carData.id ? { ...c, done: true } : c))
                                            return next
                                        })
                                    }}
                                    isChickenJumping={isJumping}
                                    chickenTargetLane={jumpTargetLane}
                                />
                            ))}

                            {/* Blocker Image visible when lane is base blocked, reservation pause, or server says next lane is blocked */}
                            {(globalIndex > 0 && computedHasBlocker) && (
                                <div className="absolute left-0 right-0 h-8 flex items-center justify-center"
                                     style={{ top: `${GAME_CONFIG.BLOCKER.TOP_PERCENT}%`, transform: 'translateY(-50%)', zIndex: 3 }}>
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
                            )}





                            {/* Lane Divider Lines - Realistic Road Markings for each lane (excluding sideroad) */}
                            {globalIndex > 0 && globalIndex < allLanes.length - 1 && (
                                <div className="absolute right-0 top-0 bottom-0 w-1 bg-transparent z-10">
                                    <div className="lane-divider-dashes"></div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Final Side Road Column outside the last lane: always render so it never disappears */}
            <div
                className="absolute"
                style={{
                    top: 0,
                    bottom: 0,
                    left: `${SIDEWALK_WIDTH_PX + (remainingMultipliers.length * LANE_WIDTH_PX)}px`,
                    width: `${FINAL_SIDEWALK_WIDTH_PX}px`,
                    ...getBackgroundOffset('main'),
                    zIndex: 2
                }}
            >
                <img
                    src={finalSideRoadImage}
                    alt="Final Side Road"
                    className="w-full h-full object-cover"
                    style={{ objectPosition: 'top center' }}
                />
            </div>

            {/* Chicken position indicator - show on all lanes including final sidewalk */}
            {((currentIndex >= 0 && currentIndex <= remainingMultipliers.length) || isJumping) && (
                <div
                    className="absolute"
                    style={{
                        ...getChickenPosition(),
                        zIndex: 10 // Always on top
                    }}
                >
                    <Chicken
                        isDead={isDead}
                        currentMultiplier={globalCurrentIndex > 0 ? allLanes[globalCurrentIndex - 1] : null}
                        showMultiplier={globalCurrentIndex > 0}
                        isJumping={isJumping}
                        animationFrame={Math.floor(jumpProgress * 6) % 6}
                        fps={4}
                        size="auto" // Responsive auto-sizing
                    />
                </div>
            )}

            {/* Cars are now attached directly to their lanes above - no separate positioning needed */}

        </div>
    )
}

export default Lane
