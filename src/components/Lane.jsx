import React, { useState, useEffect } from 'react'
import cap1Image from '../assets/cap1.png'
import cap2Image from '../assets/cap2.png'
import blockerImage from '../assets/blocker.png'
import Chicken from './Chicken'
import Car from './Car'

// DelayedCar component to handle car timing
const DelayedCar = ({ delay, left, isAnimating = false, isContinuous = false, hasBlocker = false }) => {
    const [shouldAnimate, setShouldAnimate] = useState(false)

    useEffect(() => {
        if (isAnimating) {
            const timer = setTimeout(() => {
                setShouldAnimate(true)
            }, delay)
            return () => clearTimeout(timer)
        }
    }, [isAnimating, delay])

    return (
        <div 
            className="absolute top-0 transform -translate-x-1/2" 
            style={{ left }}
        >
            <Car 
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
    betAmount = 10
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
    
    return (
        <div className="relative w-full h-full road-surface overflow-hidden">
            {/* Lane background with enhanced styling */}
            <div className="absolute inset-0 bg-gradient-to-r from-gray-600 to-gray-800"></div>
            
            {/* Sidewalk area */}
            <div className="absolute left-0 top-0 w-16 h-full sidewalk"></div>

            {/* Lane markers/segments */}
            <div className="absolute inset-0 flex">
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
                            {/* Chicken in current lane */}
                            {isCurrent && (
                                <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2">
                                    <Chicken
                                        isDead={isDead}
                                        currentMultiplier={multiplier}
                                        showMultiplier={true}
                                        className="object-contain drop-shadow-md"
                                    />
                                </div>
                            )}

                            {/* Blocker for completed lanes */}
                            {isCompleted && globalIndex > 0 && (
                                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
                                    <img
                                        src={blockerImage}
                                        alt="Blocker"
                                        className="h-6 w-auto object-contain"
                                    />
                                </div>
                            )}

                            {/* Multiplier text overlay */}
                            {(isCompleted || isFuture) && globalIndex > 0 && (
                                <div className="absolute inset-0 flex items-end justify-center pb-8">
                                    <div className="multiplier-display rounded-lg px-3 py-2">
                                        <span className="text-white font-bold text-sm text-glow">
                                            {multiplier.toFixed(2)}x
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Moving cars for all lanes */}
            {generateMovingCars().map((car, carIndex) => (
                <DelayedCar
                    key={`moving-car-${car.globalIndex}`}
                    delay={car.delay}
                    left={`${((car.localIndex + 0.5) / remainingMultipliers.length) * 100}%`}
                    isAnimating={true}
                    isContinuous={!car.hasBlocker}
                    hasBlocker={car.hasBlocker}
                />
            ))}

        </div>
    )
}

export default Lane