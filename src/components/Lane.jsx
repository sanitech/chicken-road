import React, { useState, useEffect } from 'react'
import cap1Image from '../assets/cap1.png'
import cap2Image from '../assets/cap2.png'
import blockerImage from '../assets/blocker.png'
import sideroadImage from '../assets/sideroad.png'
import audioManager from '../utils/audioUtils'
import Chicken from './Chicken'
import Car from './Car'
import Truck from './Truck'

// DelayedCar component to handle car timing
const DelayedCar = ({ delay, left, isAnimating = false, isContinuous = false, hasBlocker = false }) => {
    const [shouldAnimate, setShouldAnimate] = useState(false)

    useEffect(() => {
        if (isAnimating) {
            const timer = setTimeout(() => {
                setShouldAnimate(true)
                // Play car sound when car starts moving
                audioManager.playCarSound()
            }, delay)
            return () => clearTimeout(timer)
        }
    }, [isAnimating, delay])

    return (
        <div 
            className="absolute top-0 transform -translate-x-1/2" 
            style={{ left }}
        >
            <Truck 
                isAnimating={shouldAnimate}
                isContinuous={isContinuous}
                hasBlocker={hasBlocker}
                onAnimationComplete={() => {}}
            />
        </div>
    )
}

const Lane = ({ 
    remainingMultipliers, 
    currentIndex, 
    globalCurrentIndex, 
    globalDisplayStart, 
    isDead = false, 
    crashIndex, 
    shouldAnimateCar = false, 
    gameEnded = false,
    betAmount = 10,
    isJumping = false,
    jumpProgress = 0,
    jumpStartLane = 0,
    jumpTargetLane = 0
}) => {
    const [carAnimationState, setCarAnimationState] = useState({
        isAnimating: false,
        hasCompleted: false
    })

    // Calculate cash amount for each multiplier
    const calculateCashAmount = (multiplier) => {
        return (betAmount * multiplier).toFixed(2)
    }

    // Trigger car animation when chicken reaches crash position
    useEffect(() => {
        if (shouldAnimateCar && !carAnimationState.hasCompleted) {
            setCarAnimationState({
                isAnimating: true,
                hasCompleted: false
            })
        }
    }, [shouldAnimateCar, carAnimationState.hasCompleted])

    // Generate moving cars for future lanes
    const generateMovingCars = () => {
        const movingCars = []
        
        remainingMultipliers.forEach((multiplier, index) => {
            const globalIndex = globalDisplayStart + index
            const isCurrentLane = globalIndex === globalCurrentIndex
            const isCompleted = globalIndex < globalCurrentIndex
            const isFutureLane = globalIndex > globalCurrentIndex
            
            // Only add cars to future lanes (not current or completed)
            if (isFutureLane && !isCurrentLane && globalIndex > 0) {
                // Calculate delay based on distance from current lane
                const distanceFromCurrent = Math.abs(globalIndex - globalCurrentIndex)
                const baseDelay = Math.random() * 3000 + 2000 // 2-5 seconds
                const delay = baseDelay + (distanceFromCurrent * 1000) // +1000ms per lane
                
                movingCars.push({
                    globalIndex,
                    localIndex: index,
                    delay: delay,
                    hasBlocker: false, // Cars in future lanes don't have blockers yet
                    carType: 'continuous' // Mark as continuous moving car
                })
            }
            
            // Add cars to completed lanes that will brake and stop at blockers
            if (isCompleted && globalIndex > 0) {
                // Calculate delay based on distance from current lane - faster for braking
                const distanceFromCurrent = Math.abs(globalIndex - globalCurrentIndex)
                const baseDelay = Math.random() * 1500 + 500 // 0.5-2 seconds for braking
                const delay = baseDelay + (distanceFromCurrent * 300) // +300ms per lane
                
                movingCars.push({
                    globalIndex,
                    localIndex: index,
                    delay: delay,
                    hasBlocker: true, // Cars in completed lanes will brake and stop
                    carType: 'braking' // Mark as braking car
                })
            }
        })
        
        return movingCars
    }

    // Calculate chicken position - simple positioning without jump animations
    const getChickenPosition = () => {
        // Chicken starts completely on sidewalk (when globalCurrentIndex is 0)
        if (globalCurrentIndex === 0) {
            return {
                left: '2.5rem', // Center of sidewalk (w-20 = 5rem, so center at 2.5rem)
                top: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 20 // Above sidewalk z-10
            }
        }
        
        // For road lanes, calculate position within the lane container
        // Lane container starts at marginLeft: '5rem' and has flex-1 children
        // Each lane takes equal width of remaining space
        const availableWidth = 'calc(100% - 5rem)' // Total width minus sidewalk
        const laneWidth = `calc(${availableWidth} / ${remainingMultipliers.length})` // Width per lane
        const laneIndex = globalCurrentIndex - globalDisplayStart // Index within visible lanes
        const laneStartPosition = `calc(5rem + ${laneIndex} * (${availableWidth} / ${remainingMultipliers.length}))` // Start of lane
        const laneCenterPosition = `calc(${laneStartPosition} + (${availableWidth} / ${remainingMultipliers.length}) / 2)` // Center of lane
        
        return {
            left: laneCenterPosition,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 20 // Above sidewalk and other elements
        }
    }

    // No background offset needed - removed jump animations
    const getBackgroundOffset = () => {
        return { transform: 'translateX(0)' }
    }
    
    return (
        <div className="relative w-full h-full overflow-hidden">
            {/* Road background with official color - FIXED during jumps */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundColor: '#706B69'
                }}
            ></div>
            
            {/* Sidewalk area with realistic texture - FIXED during jumps */}
            <div 
                className="absolute left-0 top-0 w-20 h-full bg-cover bg-center bg-no-repeat z-10"
                style={{
                    backgroundImage: `url(${sideroadImage})`,
                    backgroundSize: '100% 100%'
                }}
            ></div>

            {/* Lane markers/segments with subtle parallax effect */}
            <div 
                className="absolute inset-0 flex"
                style={{
                    ...getBackgroundOffset(),
                    marginLeft: '5rem' // Start lanes after sidewalk (w-20 = 5rem)
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
                            className={`flex-1 road-lane relative ${
                                (isCompleted || isCurrent || isFuture) && globalIndex > 0 ? 'shadow-inner' : ''
                            }`}
                            style={{
                                backgroundImage: (isCompleted && globalIndex > 0) ? `url(${cap2Image})` : ((isCurrent || isFuture) && globalIndex > 0) ? `url(${cap1Image})` : 'none',
                                backgroundSize: '60%',
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'center bottom',
                            }}
                        >

                            {/* Blocker for completed lanes */}
                            {isCompleted && globalIndex > 0 && (
                                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
                                    <img
                                        src={blockerImage}
                                        alt="Blocker"
                                        className="h-6 w-auto object-contain"
                                    />
                                </div>
                            )}

                            {/* Multiplier text overlay - show for road lanes only (after sidewalk) */}
                            {(isCompleted || isCurrent || isFuture) && globalIndex > 0 && globalIndex <= 5 && (
                                <div className="absolute inset-0 flex items-end justify-center pb-2">
                                    <div className="multiplier-button rounded-lg px-3 py-2">
                                        <span className="multiplier-text text-sm">
                                            {remainingMultipliers[globalIndex - globalDisplayStart]?.toFixed(2) || ''}x
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Moving cars for all lanes with subtle parallax effect */}
            {generateMovingCars().map((car, carIndex) => (
                <div
                    key={`moving-car-${car.globalIndex}`}
                    className="absolute top-0 transform -translate-x-1/2"
                    style={{
                        left: `calc(${((car.localIndex + 0.5) / remainingMultipliers.length) * 100}% + 5rem)`, // Account for sidewalk offset
                        animationDelay: `${car.delay}ms`,
                        ...getBackgroundOffset()
                    }}
                >
                    <Truck
                        isAnimating={true}
                        isContinuous={!car.hasBlocker}
                        hasBlocker={car.hasBlocker}
                        onAnimationComplete={() => {}}
                    />
                </div>
            ))}

            {/* Main Chicken with Jump Physics */}
            <div 
                className="absolute transition-none"
                style={getChickenPosition()}
            >
                <Chicken
                    isDead={isDead}
                    currentMultiplier={remainingMultipliers[currentIndex] || 1}
                    showMultiplier={false}
                    className="object-contain drop-shadow-lg"
                />
            </div>

        </div>
    )
}

export default Lane