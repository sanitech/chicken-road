import React, { useState, useEffect } from 'react'
import cap1Image from '../assets/cap1.png'
import cap2Image from '../assets/cap2.png'
import blockerImage from '../assets/blocker.png'
import sideroadImage from '../assets/sideroad.png'
import audioManager from '../utils/audioUtils'
import Chicken from './Chicken'
import Car from './Car'

function Lane({ remainingMultipliers, currentIndex, globalCurrentIndex, globalDisplayStart, isDead = false, crashIndex, shouldAnimateCar = false, gameEnded = false, isPlaying = false, isJumping = false, jumpProgress = 0, jumpStartLane = 0, jumpTargetLane = 0 }) {
    const [carAnimationState, setCarAnimationState] = useState({
        isAnimating: false,
        hasCompleted: false
    })
    
    // Track cumulative background offset for parallax
    const [backgroundOffset, setBackgroundOffset] = useState(0)
    
    // Calculate center position for any lane index - works with responsive sizing
    const calculateLaneCenter = (laneIndex) => {
        const totalSections = remainingMultipliers.length + 1 // +1 for sideroad
        const sectionWidth = 100 / totalSections // Each section as percentage
        
        if (laneIndex === -1) {
            // Sideroad center
            return sectionWidth / 2
        } else {
            // Lane center (adjusted for sideroad)
            const adjustedIndex = laneIndex - globalDisplayStart + 1 // +1 to account for sideroad
            return (adjustedIndex + 0.5) * sectionWidth
        }
    }

    // Calculate distance between two lanes for animation
    const calculateLaneDistance = (fromLane, toLane) => {
        const fromCenter = calculateLaneCenter(fromLane)
        const toCenter = calculateLaneCenter(toLane)
        return Math.abs(toCenter - fromCenter)
    }
    
    // Update background offset when parallax jump completes
    useEffect(() => {
        if (!isJumping && jumpTargetLane >= 2 && jumpStartLane !== jumpTargetLane) {
            // Jump just completed and was a parallax jump
            const laneDistance = calculateLaneDistance(jumpStartLane, jumpTargetLane)
            const jumpShift = laneDistance * -1 // Full shift for completed jump
            setBackgroundOffset(prev => prev + jumpShift)
        }
    }, [isJumping, jumpTargetLane, jumpStartLane])
    
    // Reset UI when game ends
    useEffect(() => {
        if (gameEnded || !isPlaying) {
            // Reset background offset to original position
            setBackgroundOffset(0)
            
            // Reset car animation state
            setCarAnimationState({
                isAnimating: false,
                hasCompleted: false
            })
        }
    }, [gameEnded, isPlaying])

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

    // Calculate chicken position - clean implementation like chicken-front2
    const getChickenPosition = () => {
        if (!isJumping) {
            // Check if chicken is in a parallax lane (lane 2+)
            if (globalCurrentIndex >= 2) {
                // For parallax lanes, always keep chicken centered
                return {
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 20
                }
            } else {
                // For normal lanes, use actual lane center
                const centerPosition = calculateLaneCenter(globalCurrentIndex)
                return {
                    left: `${centerPosition}%`,
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 20
                }
            }
        }

        // During jump animation
        const isParallaxLane = jumpTargetLane >= 2
        
        // Calculate jump physics
        const jumpHeight = Math.sin(jumpProgress * Math.PI) * 80
        const verticalOffset = -jumpHeight
        const rotation = Math.sin(jumpProgress * Math.PI) * 15
        const scale = isParallaxLane ? 1 + (Math.sin(jumpProgress * Math.PI) * 0.1) : 1

        if (isParallaxLane) {
            // For parallax jumps, keep chicken centered
            return {
                left: '50%',
                top: '50%',
                transform: `translate(-50%, calc(-50% + ${verticalOffset}px)) rotate(${rotation}deg) scale(${scale})`,
                transition: 'none',
                zIndex: 20
            }
        } else {
            // For normal jumps, move between actual positions
            const startPosition = calculateLaneCenter(jumpStartLane)
            const endPosition = calculateLaneCenter(jumpTargetLane)
            const horizontalPosition = startPosition + (endPosition - startPosition) * jumpProgress

            return {
                left: `${horizontalPosition}%`,
                top: '50%',
                transform: `translate(-50%, calc(-50% + ${verticalOffset}px)) rotate(${rotation}deg)`,
                transition: 'none',
                zIndex: 20
            }
        }
    }

    // Calculate background parallax offset during jump - maintains cumulative offset
    const getBackgroundOffset = () => {
        if (!isJumping) {
            return { transform: `translateX(${backgroundOffset}%)` }
        }

        // Only apply parallax effect for second lane and beyond
        const isParallaxLane = jumpTargetLane >= 2
        
        if (!isParallaxLane) {
            return { transform: `translateX(${backgroundOffset}%)` }
        }

        // Calculate how much the background should move based on distance between lanes
        const laneDistance = calculateLaneDistance(jumpStartLane, jumpTargetLane)
        
        // Add current jump shift to existing background offset
        const currentJumpShift = laneDistance * jumpProgress * -1 // Negative for opposite direction
        const totalOffset = backgroundOffset + currentJumpShift
        
        return {
            transform: `translateX(${totalOffset}%)`,
            transition: 'none'
        }
    }

    // Generate moving cars - adapted from chicken-front2
    const generateMovingCars = () => {
        const movingCars = []

        remainingMultipliers.forEach((multiplier, index) => {
            const globalIndex = globalDisplayStart + index
            const isCurrentLane = globalIndex === globalCurrentIndex
            const isNextLane = globalIndex === globalCurrentIndex + 1
            const isCrashLane = globalIndex === crashIndex - 1
            const isCompleted = globalIndex < globalCurrentIndex
            const isCap2Lane = isCompleted && globalIndex > 0

            // Add moving car if conditions are met
            const isCurrentLaneAtCrashMinus1 = isCurrentLane && globalCurrentIndex === crashIndex - 1
            if ((!isCurrentLane || isCurrentLaneAtCrashMinus1) && !isNextLane && !isCap2Lane && globalIndex >= 0) {
                const distanceFromCurrent = Math.abs(globalIndex - globalCurrentIndex)
                const delay = distanceFromCurrent * 500 // 500ms delay per lane distance

                movingCars.push({
                    globalIndex,
                    localIndex: index,
                    delay: delay
                })
            }
        })

        return movingCars
    }

    return (
        <div className="relative w-full h-full overflow-hidden">
            {/* Road background with official color */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundColor: '#706B69',
                    filter: isJumping && jumpTargetLane >= 2 ? `blur(${jumpProgress * 2}px)` : 'none',
                    transition: 'none'
                }}
            ></div>
            
            {/* Sideroad area - separate from lanes but same width */}
            <div 
                className="absolute left-0 top-0 h-full bg-cover bg-center bg-no-repeat z-10"
                style={{
                    width: `${100 / (remainingMultipliers.length + 1)}%`,
                    backgroundImage: `url(${sideroadImage})`,
                    backgroundSize: '100% 100%'
                }}
            ></div>

            {/* Lane markers/segments with parallax effect */}
            <div 
                className="absolute inset-0 flex"
                style={{
                    ...getBackgroundOffset(),
                    marginLeft: `${100 / (remainingMultipliers.length + 1)}%`,
                    filter: isJumping && jumpTargetLane >= 2 ? `blur(${jumpProgress * 1}px)` : 'none'
                }}
            >
                {remainingMultipliers.map((multiplier, index) => {
                    const globalIndex = globalDisplayStart + index
                    const isCompleted = globalIndex < globalCurrentIndex
                    const isCurrent = globalIndex === globalCurrentIndex
                    const isFuture = globalIndex > globalCurrentIndex

                    return (
                        <div
                            key={globalIndex}
                            className={`flex justify-center grow border-r-2 border-dashed border-gray-500 relative bg-gray-600`}
                            style={{
                                backgroundImage: isCompleted ? `url(${cap2Image})` : 
                                               (isCurrent || isFuture) ? `url(${cap1Image})` : 'none',
                                backgroundSize: '60%',
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'center',
                                opacity: 1
                            }}
                        >
                            {/* Blocker for completed lanes */}
                            {((isCompleted && globalIndex > 0) || (isCurrent && globalIndex > 0)) && globalIndex !== crashIndex && globalIndex !== crashIndex - 1 && (
                                <div className="absolute top-0 left-0 right-0 h-8 flex items-center justify-center">
                                    <img
                                        src={blockerImage}
                                        alt="Blocker"
                                        className="h-6 w-auto object-contain"
                                    />
                                </div>
                            )}

                            {/* Multiplier text overlay */}
                            {(isCompleted || isFuture) && globalIndex >= 0 && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-white font-bold text-xs">
                                        {remainingMultipliers[globalIndex]?.toFixed(2) || ''}x
                                    </span>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Chicken position indicator - always visible */}
            {((currentIndex >= 0 && currentIndex < remainingMultipliers.length) || isJumping || globalCurrentIndex === -1 || globalCurrentIndex >= 0) && (
                <div
                    className="absolute"
                    style={getChickenPosition()}
                >
                    <Chicken
                        isDead={isDead}
                        currentMultiplier={currentIndex > 0 ? remainingMultipliers[currentIndex] : null}
                        showMultiplier={false} // We handle multipliers separately
                        className="object-contain drop-shadow-lg"
                    />
                </div>
            )}

            {/* Car at crash lane - centered using calculation function */}
            {crashIndex - 1 >= globalDisplayStart &&
             crashIndex - 1 < globalDisplayStart + remainingMultipliers.length &&
             crashIndex - 1 !== globalCurrentIndex + 1 && (
                <div
                    className="absolute top-0 transform -translate-x-1/2"
                    style={{
                        left: `${calculateLaneCenter(crashIndex - 1)}%`,
                        ...getBackgroundOffset()
                    }}
                >
                    <Car
                        isAnimating={true}
                        isContinuous={true}
                        onAnimationComplete={handleCarAnimationComplete}
                    />
                </div>
            )}

            {/* Moving cars for future lanes - centered using calculation function */}
            {generateMovingCars().map((car, carIndex) => (
                <div
                    key={`moving-car-${car.globalIndex}`}
                    className="absolute top-0 transform -translate-x-1/2"
                    style={{
                        left: `${calculateLaneCenter(car.globalIndex)}%`,
                        animationDelay: `${car.delay}ms`,
                        ...getBackgroundOffset()
                    }}
                >
                    <Car
                        isAnimating={true}
                        isContinuous={true}
                        onAnimationComplete={() => {}}
                    />
                </div>
            ))}

        </div>
    )
}

export default Lane