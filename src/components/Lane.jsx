import React, { useState, useEffect } from 'react'
import cap1Image from '../assets/cap1.png'
import cap2Image from '../assets/cap2.png'
import blockerImage from '../assets/blocker.png'
import sideRoadImage from '../assets/sideroad.png'
import crashAudio from '../assets/audio/crash.6d250f25.mp3'
import Chicken from './Chicken'
import Car from './Car'

// Smart Car Component with chicken collision detection and pause system
function DynamicCar({ carData, hasBlocker, onAnimationComplete, isChickenJumping, chickenTargetLane }) {
    const [carState, setCarState] = useState('waiting') // waiting -> moving -> paused -> stopped -> gone
    const [hasPlayedCrashAudio, setHasPlayedCrashAudio] = useState(false) // Track if audio already played

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

        // Check if chicken is jumping to this car's lane at same time
        if (isChickenJumping && chickenTargetLane === carData.laneIndex) {
            // Pause car when chicken jumps to same lane
            const pauseTimer = setTimeout(() => {
                setCarState('paused')
                console.log(`Car paused - chicken jumping to lane ${carData.laneIndex}`)
            }, 200) // Small delay to detect chicken jump

            return () => clearTimeout(pauseTimer)
        }

        // If there's a blocker, car uses pause-resume animation with crash sound
        if (hasBlocker) {
            setCarState('paused') // Use pause animation that includes resume

            // Play crash audio when car hits blocker
            playCrashAudio()

            const completeTimer = setTimeout(() => {
                setCarState('gone')
                if (carData.isCrashLane && onAnimationComplete) {
                    onAnimationComplete()
                }
                console.log(`Car completed pause-resume cycle in lane ${carData.laneIndex}`)
            }, carData.animationDuration) // Full animation duration includes pause and resume

            return () => clearTimeout(completeTimer)
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
    }, [carData.id, carData.animationDuration, carData.isCrashLane, carData.laneIndex, hasBlocker, onAnimationComplete, isChickenJumping, chickenTargetLane])

    if (carState === 'waiting' || carState === 'gone') return null

    return (
        <div
            className="absolute top-0 left-1/2 transform -translate-x-1/2"
            style={{
                // Dynamic animation speed based on car data
                '--car-animation-duration': `${carData.animationDuration}ms`
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

function Lane({ remainingMultipliers, currentIndex, globalCurrentIndex, globalDisplayStart, allLanes, isDead = false, crashIndex, shouldAnimateCar = false, gameEnded = false, isJumping = false, jumpProgress = 0, jumpStartLane = 0, jumpTargetLane = 0, isRestarting = false }) {
    const [carAnimationState, setCarAnimationState] = useState({
        isAnimating: false,
        hasCompleted: false
    })

    // Dynamic car generation state
    const [dynamicCars, setDynamicCars] = useState(new Map())

    // Realistic car generation system like real-world games
    useEffect(() => {
        const carTimers = new Map()

        // Lane-based speed patterns (consistent per lane like real games)
        const getLaneSpeed = (globalIndex) => {
            const isCrashLane = globalIndex === crashIndex - 1

            // Each lane has consistent speed - no random variation per car
            if (isCrashLane) {
                return 1200 // Crash lane: fast and dangerous
            }

            // Different lanes have different consistent speeds
            const laneSpeedPattern = [
                2800, // Lane 1: slow
                2600, // Lane 2: medium-slow  
                2400, // Lane 3: medium
                2200, // Lane 4: medium-fast
                2000, // Lane 5+: fast
            ]

            const patternIndex = Math.min(globalIndex - 1, laneSpeedPattern.length - 1)
            return laneSpeedPattern[patternIndex] || 2000
        }

        const generateCarForLane = (globalIndex) => {
            if (!shouldShowCarInLane(globalIndex)) return

            const isCrashLane = globalIndex === crashIndex - 1
            const animationDuration = getLaneSpeed(globalIndex) // Consistent speed per lane

            // Create car with consistent lane-based timing
            const carData = {
                id: `car-${globalIndex}-${Date.now()}`,
                isCrashLane,
                animationDuration,
                startTime: Date.now(),
                laneIndex: globalIndex
            }

            setDynamicCars(prev => new Map(prev.set(globalIndex, carData)))

            // Debug: Show consistent lane speeds
            console.log(`Lane ${globalIndex}: Speed ${animationDuration}ms, Crash: ${isCrashLane}`)

            // Consistent traffic intervals per lane (like real games)
            const getTrafficInterval = (globalIndex) => {
                const isCrashLane = globalIndex === crashIndex - 1

                if (isCrashLane) {
                    return 1800 + Math.random() * 1200 // Crash lane: 1.8-3s intervals
                }

                // Each lane has consistent traffic density
                const baseInterval = 2500 + (globalIndex * 200) // Later lanes = longer intervals
                return baseInterval + Math.random() * 1000 // Small random variation
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
                // Stagger initial car spawns (realistic traffic flow)
                const initialDelay = Math.random() * 2000
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
    }, [remainingMultipliers, globalCurrentIndex, crashIndex, globalDisplayStart])

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

        // Handle restart animation - smooth transition back to side road
        if (isRestarting) {
            return {
                left: '15%', // Side road position
                top: '50%',
                transform: 'translate(-50%, -50%)',
                transition: 'all 1s ease-in-out' // Smooth 1-second animation
            }
        }

        if (!isJumping) {
            // Responsive positioning based on screen size
            const getResponsivePosition = (basePosition) => {
                if (window.innerWidth < 640) return basePosition // Mobile: keep full position
                if (window.innerWidth < 768) return basePosition * 0.95 // Tablet: slight adjustment
                if (window.innerWidth < 1024) return basePosition * 0.9 // Desktop: moderate adjustment
                return basePosition * 0.85 // Large screens: some adjustment
            }

            if (isAtStart) {
                // Chicken starts from side road (responsive positioning)
                return {
                    left: `${getResponsivePosition(15)}%`, // Responsive side road position
                    top: '50%',
                    transform: 'translate(-50%, -50%)'
                }
            } else if (globalCurrentIndex === 1) {
                // First lane position (responsive)
                return {
                    left: `${getResponsivePosition(40)}%`, // Responsive first lane position
                    top: '50%',
                    transform: 'translate(-50%, -50%)'
                }
            } else if (globalCurrentIndex === 2) {
                // Center position for lane 2
                return {
                    left: '65%', // Center position
                    top: '50%',
                    transform: 'translate(-50%, -50%)'
                }
            }
            else {
                // Center position for lanes 3+
                return {
                    left: '50%', // True center for higher lanes
                    top: '50%',
                    transform: 'translate(-50%, -50%)'
                }
            }
        }

        // Jump animation - only vertical movement and rotation (mobile optimized)
        const jumpHeight = Math.sin(jumpProgress * Math.PI) * 60 // Reduced from 80px for mobile
        const verticalOffset = -jumpHeight
        const rotation = Math.sin(jumpProgress * Math.PI) * 10 // Reduced from 15 degrees
        const scale = 1 + (Math.sin(jumpProgress * Math.PI) * 0.05) // Much more subtle scaling (reduced from 0.1)

        // Handle different jump types with proper positioning (updated to match your changes)
        if (jumpStartLane === 0 && jumpTargetLane === 1) {
            // First jump: Side road (20%) to first lane (40%)
            const horizontalProgress = jumpProgress
            const startX = 20 // Side road position (matches your correction)
            const endX = 40 // First lane position (matches your correction)
            const currentX = startX + (endX - startX) * horizontalProgress

            return {
                left: `${currentX}%`,
                top: '50%',
                transform: `translate(-50%, calc(-50% + ${verticalOffset}px)) rotate(${rotation}deg) scale(1)`, // No scaling for first jump
                transition: 'none',
                zIndex: 10
            }
        } else if (jumpStartLane === 1 && jumpTargetLane === 2) {
            // Second jump: First lane (40%) to center (65%)
            const horizontalProgress = jumpProgress
            const startX = 40 // First lane position (matches your correction)
            const endX = 65 // Center position (matches your correction)
            const currentX = startX + (endX - startX) * horizontalProgress

            return {
                left: `${currentX}%`,
                top: '50%',
                transform: `translate(-50%, calc(-50% + ${verticalOffset}px)) rotate(${rotation}deg) scale(${scale})`,
                transition: 'none',
                zIndex: 10
            }
        } else {
            // Normal center jumps for lanes 3+ (stay at center after positioning jumps)
            return {
                left: '50%', // True center for lanes 3+ (after positioning is complete)
                top: '50%',
                transform: `translate(-50%, calc(-50% + ${verticalOffset}px)) rotate(${rotation}deg) scale(${scale})`,
                transition: 'none',
                zIndex: 10
            }
        }
    }

    // Lane movement system - lanes move, chicken stays fixed (except first jump)
    const getBackgroundOffset = (layer = 'main') => {
        if (!isJumping) {
            return { transform: 'translateX(0)' }
        }

        // NO PARALLAX on first two jumps - only chicken moves to get into position
        if ((jumpStartLane === 0 && jumpTargetLane === 1) || (jumpStartLane === 1 && jumpTargetLane === 2)) {
            return { transform: 'translateX(0)' } // Keep lanes static for positioning jumps
        }

        // Multi-layer movement with different speeds for depth effect (after first jump)
        const layerSpeeds = {
            background: 0.5, // Slower (far background)
            main: 1.0        // Full speed (lanes and cars together)
        }

        // Calculate smooth lane movement with pixel-perfect alignment
        const laneDistance = 100 / remainingMultipliers.length // Distance between lanes in %
        const totalMovement = laneDistance // Move by one lane width

        // Apply smooth easing curve for natural movement
        const easedProgress = jumpProgress < 0.5
            ? 2 * jumpProgress * jumpProgress // Ease-in (first half)
            : 1 - Math.pow(-2 * jumpProgress + 2, 2) / 2 // Ease-out (second half)

        // Layer-specific movement calculation with sub-pixel precision
        const layerSpeed = layerSpeeds[layer] || layerSpeeds.main
        const movementOffset = Math.round(-totalMovement * easedProgress * layerSpeed * 100) / 100 // Round to prevent sub-pixel gaps

        return {
            transform: `translateX(${movementOffset}%)`,
            transition: 'none'
        }
    }

    // Determine which lanes should show cars - realistic logic
    const shouldShowCarInLane = (globalIndex) => {
        const isCurrentLane = globalIndex === globalCurrentIndex
        const isNextLane = globalIndex === globalCurrentIndex + 1 // Next lane where chicken will jump to
        const isCrashLane = globalIndex === crashIndex - 1 // Crash lane where chicken dies
        const isPassedLane = globalIndex < globalCurrentIndex // Lanes chicken has already passed
        const hasBlocker = ((globalIndex < globalCurrentIndex && globalIndex > 0) || (globalIndex === globalCurrentIndex && globalIndex > 0)) && globalIndex !== crashIndex && globalIndex !== crashIndex - 1

        // Don't generate cars in:
        // 1. Lanes chicken has passed (realistic - no traffic behind)
        // 2. Current lane (chicken is there)
        // 3. Next lane (for crash determination)
        // 4. Lane 0 (starting position)
        if (isPassedLane || isCurrentLane || isNextLane || globalIndex === 0) {
            return false
        }

        // Only crash lane can have cars when it's current lane
        if (isCurrentLane && !isCrashLane) {
            return false
        }

        return true
    }

    return (
        <div
            className=""
        >
            {/* Far background layer - moves slower */}
            <div
                className="absolute inset-0"
                style={{
                    background: `linear-gradient(to right, #716C69, #5A5651)`, // Custom gradient with your color
                    ...getBackgroundOffset('background'),
                    filter: isJumping ? `blur(${jumpProgress * 2}px)` : 'none',
                    transition: 'none',
                    zIndex: 1
                }}
            ></div>

            {/* Main background layer - moves at normal speed */}
            <div
                className="absolute inset-0"
                style={{
                    background: `linear-gradient(to right, #716C69, #635E5A)`, // Custom gradient with your color
                    ...getBackgroundOffset('main'),
                    filter: isJumping ? `blur(${jumpProgress * 1}px)` : 'none',
                    transition: 'none',
                    opacity: 0.8,
                    zIndex: 2
                }}
            ></div>

            {/* Continuous background fill to prevent black lines */}
            <div
                className="absolute"
                style={{
                    backgroundColor: '#716C69', // Custom lane color
                    left: '-50%',
                    right: '-50%',
                    top: 0,
                    bottom: 0,
                    ...getBackgroundOffset('main'),
                    transition: 'none',
                    zIndex: 2.5
                }}
            ></div>

            {/* Lane markers/segments - main movement */}
            <div
                className="absolute flex"
                style={{
                    left: '-20%', // Extend beyond visible area
                    right: '-20%',
                    top: 0,
                    bottom: 0,
                    ...getBackgroundOffset('main'),
                    transition: 'none',
                    zIndex: 3
                }}
            >
                {remainingMultipliers.map((multiplier, index) => {
                    const globalIndex = globalDisplayStart + index
                    // During jumps, use the start position to prevent lane state flickering
                    const referenceIndex = isJumping ? jumpStartLane : globalCurrentIndex
                    const isCompleted = globalIndex < referenceIndex
                    const isCurrent = globalIndex === referenceIndex
                    const isFuture = globalIndex > referenceIndex

                    return (
                        <div
                            key={globalIndex}
                            className={`${globalIndex === 0 ? 'w-1/2 sm:w-2/5 md:w-1/3 lg:w-1/4' : 'flex items-end pb-52'} relative`}
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

                            {globalIndex >= 0 && (
                                <div className='relative'>
                                    <img
                                        src={(isCompleted && globalIndex > 0) ? cap2Image :
                                            ((isCurrent || isFuture) && globalIndex > 0) ? cap1Image : cap1Image}
                                        alt="Lane Image"
                                        className="w-4/5 mx-auto"
                                        style={{
                                            zIndex: 1
                                        }}
                                    />
                                    {/* Multiplier text overlay - not for side road (lane 0) */}
                                    {(isCompleted || isFuture) && globalIndex > 0 && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-white font-bold text-lg">
                                                {/* Use correct global indexing: globalIndex 1 should show allLanes[0] = 1.01x */}
                                                {allLanes[globalIndex - 1]?.toFixed(2)}x
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Smart car for this specific lane - with chicken collision detection */}
                            {dynamicCars.has(globalIndex) && (
                                <DynamicCar
                                    carData={dynamicCars.get(globalIndex)}
                                    hasBlocker={((isCompleted && globalIndex > 0) || (isCurrent && globalIndex > 0)) && globalIndex !== crashIndex && globalIndex !== crashIndex - 1}
                                    onAnimationComplete={globalIndex === crashIndex - 1 ? handleCarAnimationComplete : () => { }}
                                    isChickenJumping={isJumping}
                                    chickenTargetLane={jumpTargetLane}
                                />
                            )}

                            {/* Blocker Image */}
                            {((isCompleted && globalIndex > 0) || (isCurrent && globalIndex > 0)) && globalIndex !== crashIndex && globalIndex !== crashIndex - 1 && (
                                <div className="absolute left-0 right-0 h-8 flex items-center justify-center" style={{ bottom: '60%' }}>
                                    <img
                                        src={blockerImage}
                                        alt="Blocker"
                                        className="w-20 object-contain"
                                    />
                                </div>
                            )}





                            {/* Lane Divider Lines - Realistic Road Markings for each lane */}
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
