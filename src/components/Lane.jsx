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

    // Calculate chicken position during jump - aligned with server 0-based system
    const getChickenPosition = () => {
        if (!isJumping) {
            // Normal position - all lanes same width
            const laneIndex = globalCurrentIndex - globalDisplayStart
            const laneCenterPosition = `${((laneIndex + 0.5) / remainingMultipliers.length) * 100}%`
            
            return {
                left: laneCenterPosition,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 20
            }
        }

        // Check if this is a second lane jump or beyond for special parallax effect
        const isParallaxLane = jumpTargetLane >= 2
        
        // Calculate jump physics
        const jumpHeight = Math.sin(jumpProgress * Math.PI) * 80 // 80px peak height
        const verticalOffset = -jumpHeight
        const rotation = Math.sin(jumpProgress * Math.PI) * 15 // 15 degrees max rotation
        const scale = isParallaxLane ? 1 + (Math.sin(jumpProgress * Math.PI) * 0.1) : 1

        if (isParallaxLane) {
            // For fourth lane jump and beyond, keep chicken centered for parallax effect
            return {
                left: '50%',
                top: '50%',
                transform: `translate(-50%, calc(-50% + ${verticalOffset}px)) rotate(${rotation}deg) scale(${scale})`,
                transition: 'none',
                zIndex: 20
            }
        } else {
            // For other jumps, use normal horizontal movement - all lanes same width
            const startLaneIndex = jumpStartLane - globalDisplayStart
            const endLaneIndex = jumpTargetLane - globalDisplayStart
            
            const startPosition = ((startLaneIndex + 0.5) / remainingMultipliers.length) * 100
            const endPosition = ((endLaneIndex + 0.5) / remainingMultipliers.length) * 100
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

    // Calculate background parallax offset during jump - from chicken-front2
    const getBackgroundOffset = () => {
        if (!isJumping) {
            return { transform: 'translateX(0)' }
        }

        // Only apply parallax effect for second lane and beyond
        const isParallaxLane = jumpTargetLane >= 2
        
        if (!isParallaxLane) {
            return { transform: 'translateX(0)' }
        }

        // Calculate how much the background should move for parallax effect
        const startPosition = ((jumpStartLane - globalDisplayStart + 0.5) / remainingMultipliers.length) * 100
        const endPosition = ((jumpTargetLane - globalDisplayStart + 0.5) / remainingMultipliers.length) * 100

        // Interpolate the background movement
        const backgroundOffset = startPosition + (endPosition - startPosition) * jumpProgress
        const parallaxOffset = (backgroundOffset - 50) * -1 // Invert for parallax effect

        return {
            transform: `translateX(${parallaxOffset}%)`,
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
            


            {/* Lane markers/segments with parallax effect */}
            <div 
                className="absolute inset-0 flex"
                style={{
                    ...getBackgroundOffset(),
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
                                backgroundImage: globalIndex === 0 ? `url(${sideroadImage})` : 
                                               isCompleted ? `url(${cap2Image})` : 
                                               (isCurrent || isFuture) ? `url(${cap1Image})` : 'none',
                                backgroundSize: globalIndex === 0 ? '100% 100%' : '60%',
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
            {((currentIndex >= 0 && currentIndex < remainingMultipliers.length) || isJumping || globalCurrentIndex === 0) && (
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

            {/* Car at crash lane - positioned for our lane system */}
            {crashIndex - 1 >= globalDisplayStart &&
             crashIndex - 1 < globalDisplayStart + remainingMultipliers.length &&
             crashIndex - 1 !== globalCurrentIndex + 1 && (
                <div
                    className="absolute top-0 transform -translate-x-1/2"
                    style={{
                        left: `${((crashIndex - 1 - globalDisplayStart + 0.5) / remainingMultipliers.length) * 100}%`,
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

            {/* Moving cars for future lanes - adapted for our system */}
            {generateMovingCars().map((car, carIndex) => (
                <div
                    key={`moving-car-${car.globalIndex}`}
                    className="absolute top-0 transform -translate-x-1/2"
                    style={{
                        left: `${((car.localIndex + 0.5) / remainingMultipliers.length) * 100}%`,
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