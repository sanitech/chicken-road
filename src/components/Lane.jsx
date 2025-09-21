import React, { useState, useEffect, useRef } from 'react'
import cap1Image from '../assets/cap1.png'
import cap2Image from '../assets/cap2.png'
import blockerImage from '../assets/blocker.png'
import sideRoadImage from '../assets/sideroad.png'
import crashAudio from '../assets/audio/crash.6d250f25.mp3'
import Chicken from './Chicken'
import Car from './Car'
import { GAME_CONFIG } from '../utils/gameConfig'

// Smart Car Component with chicken collision detection and pause system
function DynamicCar({ carData, hasBlocker, onAnimationComplete, isChickenJumping, chickenTargetLane, isReservationActive = false, reservationDecision = 'pause', cutoff = 0.6 }) {
    const [carState, setCarState] = useState('waiting') // waiting -> moving -> paused -> stopped -> gone
    const [hasPlayedCrashAudio, setHasPlayedCrashAudio] = useState(false) // Track if audio already played
    const [pausedByReservation, setPausedByReservation] = useState(false)

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

        // Reservation pause (only once per reservation) based on latched decision
        if (isReservationActive && reservationDecision === 'pause' && !pausedByReservation && isChickenJumping && chickenTargetLane === carData.laneIndex) {
            const stopPercent = (GAME_CONFIG.CAR.STOP_TOP_PERCENT || 0) / 100
            const easeDelta = Math.max(0, Math.min(0.2, GAME_CONFIG.CAR.STOP_EASE_DELTA ?? 0))
            const stopAt = Math.max(0, stopPercent - easeDelta)
            const tick = () => {
                const now = Date.now()
                const progress = Math.max(0, Math.min(1, (now - carData.startTime) / carData.animationDuration))

                // Already beyond cutoff -> let it pass
                if (progress >= cutoff) return

                // Reached or passed stop threshold -> pause now
                if (progress >= stopAt) {
                    setCarState('paused')
                    setPausedByReservation(true)
                    return
                }

                // Keep polling until we hit the stop threshold or reservation ends
                if (isReservationActive && !pausedByReservation) {
                    requestAnimationFrame(tick)
                }
            }

            // Kick off the polling loop
            requestAnimationFrame(tick)
        }

        // If there's a blocker, car uses pause-resume animation with crash sound
        if (hasBlocker) {
            setCarState('paused') // Use pause animation that includes resume

            // Play crash audio when car hits blocker
            playCrashAudio()

            // Do not auto-remove the car if this pause is due to a landing reservation;
            // keep it visible until reservation ends, then it will resume and exit.
            if (!isReservationActive) {
                const completeTimer = setTimeout(() => {
                    setCarState('gone')
                    if (carData.isCrashLane && onAnimationComplete) {
                        onAnimationComplete()
                    }
                    console.log(`Car completed pause-resume cycle in lane ${carData.laneIndex}`)
                }, carData.animationDuration)

                return () => clearTimeout(completeTimer)
            }
        } else {
            // Car completes its journey and disappears
            const completionTimer = setTimeout(() => {
                setCarState('gone')
                if (carData.isCrashLane && onAnimationComplete) {
                    onAnimationComplete()
                }
            }, carData.animationDuration)

            return () => clearTimeout(completionTimer)
        }
    }, [carData.id, carData.animationDuration, carData.isCrashLane, carData.laneIndex, hasBlocker, onAnimationComplete, isChickenJumping, chickenTargetLane, isReservationActive, reservationDecision, cutoff, pausedByReservation])

    // Resume movement automatically when reservation ends
    useEffect(() => {
        if (!isReservationActive && pausedByReservation) {
            setCarState('moving')
        }
    }, [isReservationActive, pausedByReservation])

    if (carState === 'waiting' || carState === 'gone') return null

    return (
        <div 
            className="absolute left-1/2"
            style={{
                top: 0,
                transform: 'translateX(-50%)',
                // Dynamic animation speed based on car data
                '--car-animation-duration': `${carData.animationDuration}ms`,
                // Ensure cars render above cap/blocker (z-2/3) but below chicken (z-10)
                zIndex: 5
            }}
        >
            <Car
                isAnimating={carState === 'moving'}
                isContinuous={!hasBlocker && carState !== 'paused'} // Stop animation if blocked or paused
                onAnimationComplete={() => { }} // Handled by timer above
                customSpeed={carData.animationDuration}
                isBlocked={carState === 'stopped'}
                isPaused={carState === 'paused'}
            />
        </div>
    )
}

function Lane({ remainingMultipliers, currentIndex, globalCurrentIndex, globalDisplayStart, allLanes, isDead = false, shouldAnimateCar = false, gameEnded = false, isJumping = false, jumpProgress = 0, jumpStartLane = 0, jumpTargetLane = 0, isRestarting = false }) {
    const [carAnimationState, setCarAnimationState] = useState({
        isAnimating: false,
        hasCompleted: false
    })

    // Dynamic car generation state
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

            // If we decided to pause and there is no car yet, synthesize one so it animates from top
            if (decision === 'pause' && !car && target > 0) {
                const isCrashLane = false // Server handles crash detection
                const laneSpeedPattern = GAME_CONFIG.CAR_SPEED?.LANE_SPEED_PATTERN_MS || [2800,2600,2400,2200,2000]
                const crashSpeed = GAME_CONFIG.CAR_SPEED?.CRASH_LANE_SPEED_MS || 1200
                const patternIndex = Math.min(Math.max(target - 1, 0), laneSpeedPattern.length - 1)
                const animationDuration = isCrashLane ? crashSpeed : (laneSpeedPattern[patternIndex] || laneSpeedPattern[laneSpeedPattern.length - 1])
                const synthetic = {
                    id: `car-synth-${target}-${Date.now()}`,
                    isCrashLane,
                    animationDuration,
                    startTime: Date.now(),
                    laneIndex: target
                }
                setDynamicCars(prev => new Map(prev.set(target, synthetic)))
            }
        }

        // When a new jump starts, clear previous reservation visuals
        if (!prev && isJumping) {
            reservationRef.current = { active: false, targetLane: -1, decision: 'pause' }
        }
    }, [isJumping, jumpTargetLane, dynamicCars])

    // Realistic car generation system like real-world games
    useEffect(() => {
        const carTimers = new Map()

        // Lane-based speed patterns (consistent per lane like real games)
        const getLaneSpeed = (globalIndex) => {
            // Server handles crash detection - all lanes use normal speed
            // Each lane has consistent speed - no random variation per car

            // Different lanes have different consistent speeds
            const laneSpeedPattern = GAME_CONFIG.CAR_SPEED.LANE_SPEED_PATTERN_MS
            const patternIndex = Math.min(globalIndex - 1, laneSpeedPattern.length - 1)
            return laneSpeedPattern[patternIndex] || laneSpeedPattern[laneSpeedPattern.length - 1]
        }

        const generateCarForLane = (globalIndex) => {
            if (!shouldShowCarInLane(globalIndex)) return

            const animationDuration = getLaneSpeed(globalIndex) // Consistent speed per lane

            // Create car with consistent lane-based timing
            const carData = {
                id: `car-${globalIndex}-${Date.now()}`,
                isCrashLane: false, // Server handles crash detection
                animationDuration,
                startTime: Date.now(),
                laneIndex: globalIndex
            }

            setDynamicCars(prev => new Map(prev.set(globalIndex, carData)))

            // Debug: Show consistent lane speeds
            console.log(`Lane ${globalIndex}: Speed ${animationDuration}ms`)

            // Consistent traffic intervals per lane (like real games)
            const getTrafficInterval = (globalIndex) => {
                // Server handles crash detection - all lanes use normal intervals

                // Each lane has consistent traffic density - no randomness
                return GAME_CONFIG.CAR_SPEED.TRAFFIC_BASE_INTERVAL_MS + (globalIndex * GAME_CONFIG.CAR_SPEED.TRAFFIC_PER_LANE_INCREMENT_MS)
            }

            const nextCarDelay = getTrafficInterval(globalIndex)

            const timer = setTimeout(() => {
                if (!isJumping) { // Only generate if not jumping
                    generateCarForLane(globalIndex)
                }
            }, nextCarDelay)

            carTimers.set(globalIndex, timer)
        }

        // Start car generation for each lane
        remainingMultipliers.forEach((multiplier, index) => {
            const globalIndex = globalDisplayStart + index
            if (shouldShowCarInLane(globalIndex)) {
                // Stagger initial car spawns with deterministic delay
                const initialDelay = globalIndex * 500 // 500ms per lane, deterministic
                setTimeout(() => {
                    generateCarForLane(globalIndex)
                }, initialDelay)
            }
        })

        // Cleanup timers
        return () => {
            carTimers.forEach(timer => clearTimeout(timer))
            carTimers.clear()
        }
    }, [remainingMultipliers, globalCurrentIndex, globalDisplayStart])

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

        // Jump animation - vertical movement with optional rotation/scale only
        const jumpHeight = Math.sin(jumpProgress * Math.PI) * 60 // Reduced from 80px for mobile
        const verticalOffset = -jumpHeight
        const rotation = Math.sin(jumpProgress * Math.PI) * 10 // Reduced from 15 degrees
        const scale = 1 + (Math.sin(jumpProgress * Math.PI) * 0.05) // Subtle scaling

        return {
            left: getConfiguredLeft(),
            top: `${GAME_CONFIG.CHICKEN_TOP_PERCENT}%`,
            transform: `translate(-50%, calc(-50% + ${verticalOffset}px)) rotate(${rotation}deg) scale(${scale})`,
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

    // Determine which lanes should show cars - realistic logic
    const shouldShowCarInLane = (globalIndex) => {
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

    // Fixed widths from central config
    const LANE_WIDTH_PX = GAME_CONFIG.LANE_WIDTH_PX
    const SIDEWALK_WIDTH_PX = GAME_CONFIG.SIDEWALK_WIDTH_PX
    
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
                    width: `${remainingMultipliers.length * LANE_WIDTH_PX}px`,
                    ...getBackgroundOffset('main'),
                    transition: 'none',
                    zIndex: 2
                }}
            >
                {remainingMultipliers.map((multiplier, index) => {
                    const globalIndex = globalDisplayStart + index
                    // During jumps, use the start position to prevent lane state flickering
                    const referenceIndex = isJumping ? jumpStartLane : globalCurrentIndex
                    const isCompleted = globalIndex < referenceIndex
                    const isCurrent = globalIndex === referenceIndex
                    const isFuture = globalIndex > referenceIndex

                    // Compute hasBlocker for this lane (prevents cars entering/stops cars)
                    const baseBlocked = ((isCompleted && globalIndex > 0) || (isCurrent && globalIndex > 0))
                    const isReservationLane = reservationRef.current.active && reservationRef.current.targetLane === globalIndex
                    const computedHasBlocker = baseBlocked || (isReservationLane && reservationRef.current.decision === 'pause')

                    return (
                        <div
                            key={globalIndex}
                            className={`relative ${globalIndex > 0 ? 'flex items-end pb-52' : ''}`}
                            style={{ width: `${globalIndex === 0 ? SIDEWALK_WIDTH_PX : LANE_WIDTH_PX}px` }}
                            // style={{
                            //     backgroundColor: globalIndex === 0 ? '#716C69' : '#716C69', // Custom lane color for all lanes
                            //     backgroundImage: globalIndex === 0 ? 'none' : // No background for side road - using img element instead
                            //         (isCompleted && globalIndex > 0) ? `url(${cap2Image})` :
                            //             ((isCurrent || isFuture) && globalIndex > 0) ? `url(${cap1Image})` : 'none',
                            //     backgroundSize: globalIndex === 0 ? 'auto' : '80%', // No size needed for side road
                            //     backgroundRepeat: 'no-repeat',
                            //     backgroundPosition: globalIndex === 0 ? 'center' : 'center bottom 35%',
                            //     opacity: (globalIndex === 4 && (isCurrent || isFuture)) ? 0.8 : 1,
                            //     transition: isJumping ? 'none' : 'background-image 0.3s ease',
                            //     // Fix black lines by ensuring continuous coverage
                            //     // marginRight: '0px', // Overlap to prevent gaps
                            //     borderRight: globalIndex === 0 ? '4px solid rgba(156, 163, 175, 0.6)' : 'none', // Side road border only
                            //     // Responsive width constraints for side road
                            //     minWidth: globalIndex === 0 ?
                            //         window.innerWidth < 640 ? '38%' :     // Mobile: 50%
                            //             window.innerWidth < 768 ? '40%' :     // Tablet: 40%  
                            //                 window.innerWidth < 1024 ? '33%' :    // Desktop: 33%
                            //                     '25%' : 0,                            // Large: 25%
                            //     maxWidth: globalIndex === 0 ?
                            //         window.innerWidth < 640 ? '38%' :     // Mobile: 50%
                            //             window.innerWidth < 768 ? '40%' :     // Tablet: 40%
                            //                 window.innerWidth < 1024 ? '33%' :    // Desktop: 33%
                            //                     '25%' : 'none'                        // Large: 25%
                            // }}
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

                            {/* {/* Side Road  end of globalIndex === 0  the flip image  globalIndex > 0 */}
                            {globalIndex === allLanes.length - 1  && (
                                <img
                                    src={sideRoadImage}
                                    alt="Side Road"
                                    className="w-full h-full object-cover rotate-180"
                                    style={{
                                        objectPosition: 'top center',
                                        zIndex: 1
                                    }}
                                />
                            )}

                            {globalIndex > 0 && isFuture && (
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
                            {dynamicCars.has(globalIndex) && (
                                <DynamicCar
                                    carData={dynamicCars.get(globalIndex)}
                                    hasBlocker={computedHasBlocker}
                                    isReservationActive={reservationRef.current.active && reservationRef.current.targetLane === globalIndex}
                                    reservationDecision={reservationRef.current.decision}
                                    cutoff={GAME_CONFIG.BLOCKER.STOP_CUTOFF_PROGRESS}
                                    onAnimationComplete={() => { }} // Server handles crash detection
                                    isChickenJumping={isJumping}
                                    chickenTargetLane={jumpTargetLane}
                                />
                            )}

                            {/* Blocker Image (show during reservation only if decision is 'pause') */}
                            {(((isCompleted && globalIndex > 0) || (isCurrent && globalIndex > 0))
                               || (reservationRef.current.active && reservationRef.current.targetLane === globalIndex && reservationRef.current.decision === 'pause')) && (
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

            {/* Chicken position indicator - only show if chicken is in visible range */}
            {((currentIndex >= 0 && currentIndex < remainingMultipliers.length) || isJumping) && (
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
