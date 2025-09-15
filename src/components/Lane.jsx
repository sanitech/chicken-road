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
                    hasBlocker: false // Cars in future lanes don't have blockers yet
                })
            }
            
            // Add cars to completed lanes that will stop at blockers
            if (isCompleted && globalIndex > 0) {
                // Calculate delay based on distance from current lane
                const distanceFromCurrent = Math.abs(globalIndex - globalCurrentIndex)
                const baseDelay = Math.random() * 2000 + 1000 // 1-3 seconds for completed lanes
                const delay = baseDelay + (distanceFromCurrent * 500) // +500ms per lane
                
                movingCars.push({
                    globalIndex,
                    localIndex: index,
                    delay: delay,
                    hasBlocker: true // Cars in completed lanes will stop at blockers
                })
            }
        })
        
        return movingCars
    }

    // Calculate chicken position during jump with parallax effects
    const getChickenPosition = () => {
        if (!isJumping) {
            // Chicken starts completely on sidewalk (when globalCurrentIndex is 0)
            if (globalCurrentIndex === 0) {
                return {
                    left: '5%', // Position centered in sidewalk area
                    top: '50%',
                    transform: 'translate(-50%, -50%)'
                }
            }
            // Normal position for road lanes
            return {
                left: `${((globalCurrentIndex + 0.5) / remainingMultipliers.length) * 100}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)'
            }
        }

        // Check if this is a fourth lane jump or beyond for special parallax effect
        const isParallaxLane = jumpTargetLane >= 3

        // Calculate jump physics with smooth easing
        const jumpHeight = Math.sin(jumpProgress * Math.PI) * 80 // 80px peak height
        const verticalOffset = -jumpHeight
        const rotation = Math.sin(jumpProgress * Math.PI) * 15 // 15 degrees max rotation
        const scale = isParallaxLane ? 1 + (Math.sin(jumpProgress * Math.PI) * 0.1) : 1

        if (isParallaxLane) {
            // For fourth lane jump and beyond, keep chicken centered for parallax effect
            return {
                left: '50%', // Keep chicken centered during parallax jumps
                top: '50%',
                transform: `translate(-50%, calc(-50% + ${verticalOffset}px)) rotate(${rotation}deg) scale(${scale})`,
                transition: 'none',
                zIndex: 100
            }
        } else {
            // For other jumps, use normal horizontal movement
            let startPos
            if (jumpStartLane === 0) {
                startPos = 5 // Starting from sidewalk
            } else {
                startPos = ((jumpStartLane - globalDisplayStart + 0.5) / remainingMultipliers.length) * 100
            }
            
            const endPos = ((jumpTargetLane - globalDisplayStart + 0.5) / remainingMultipliers.length) * 100
            const horizontalPos = startPos + (endPos - startPos) * jumpProgress

            return {
                left: `${horizontalPos}%`,
                top: '50%',
                transform: `translate(-50%, calc(-50% + ${verticalOffset}px)) rotate(${rotation}deg)`,
                transition: 'none',
                zIndex: 100
            }
        }
    }

    // Calculate background parallax offset during jump
    const getBackgroundOffset = () => {
        if (!isJumping) {
            return { transform: 'translateX(0)' }
        }

        // Only apply parallax effect for fourth lane and beyond
        const isParallaxLane = jumpTargetLane >= 3
        if (!isParallaxLane) {
            return { transform: 'translateX(0)' }
        }

        // Calculate subtle parallax movement - much smaller effect
        let startPos
        if (jumpStartLane === 0) {
            startPos = 5
        } else {
            startPos = ((jumpStartLane - globalDisplayStart + 0.5) / remainingMultipliers.length) * 100
        }
        
        const endPos = ((jumpTargetLane - globalDisplayStart + 0.5) / remainingMultipliers.length) * 100
        const backgroundOffset = startPos + (endPos - startPos) * jumpProgress
        const parallaxOffset = (backgroundOffset - 50) * -0.2 // Much smaller parallax effect (20% instead of 100%)

        return {
            transform: `translateX(${parallaxOffset}%)`,
            transition: 'none'
        }
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
                className="absolute left-0 top-0 w-24 h-full bg-cover bg-center bg-no-repeat z-10"
                style={{
                    backgroundImage: `url(${sideroadImage})`,
                    backgroundSize: '100% 100%'
                }}
            ></div>

            {/* Lane markers/segments with subtle parallax effect */}
            <div 
                className="absolute inset-0 flex"
                style={{
                    ...getBackgroundOffset()
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
                            {(isCompleted || isFuture) && globalIndex >= 0 && globalIndex <= 5 && (
                                <div className="absolute inset-0 flex items-end justify-center pb-2">
                                    <div className="multiplier-button rounded-lg px-3 py-2">
                                        <span className="multiplier-text text-sm">
                                            {multiplier.toFixed(2)}x
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
                        left: `${((car.localIndex + 0.5) / remainingMultipliers.length) * 100}%`,
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