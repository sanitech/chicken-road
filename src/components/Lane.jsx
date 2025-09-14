import React, { useState, useEffect } from 'react'
import cap1Image from '../assets/cap1.png'
import cap2Image from '../assets/cap2.png'
import blockerImage from '../assets/blocker.png'
import Chicken from './Chicken'
import Car from './Car'

// DelayedCar component to handle car timing
function DelayedCar({ delay, left, isAnimating = false, isContinuous = false }) {
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
                onAnimationComplete={() => {}}
            />
        </div>
    )
}

function Lane({ remainingMultipliers, currentIndex, globalCurrentIndex, globalDisplayStart, isDead = false, crashIndex, shouldAnimateCar = false, gameEnded = false }) {
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

    // Generate moving cars for future lanes only (not completed or current lanes)
    const generateMovingCars = () => {
        const movingCars = []
        
        remainingMultipliers.forEach((multiplier, index) => {
            const globalIndex = globalDisplayStart + index
            const isCurrentLane = globalIndex === globalCurrentIndex
            const isCompleted = globalIndex < globalCurrentIndex
            const isFutureLane = globalIndex > globalCurrentIndex
            
            // Only add cars to future lanes (lanes the chicken hasn't reached yet)
            if (isFutureLane && !isCurrentLane && globalIndex > 0) {
                // Calculate delay based on distance from current lane
                const distanceFromCurrent = Math.abs(globalIndex - globalCurrentIndex)
                // Random delay between 2000ms and 5000ms for more realistic timing
                const baseDelay = Math.random() * 3000 + 2000
                const delay = baseDelay + (distanceFromCurrent * 1000) // 1000ms delay per lane distance
                
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
        <div className="relative w-full h-full bg-gray-700 overflow-hidden">
            {/* Lane background */}
            <div className="absolute inset-0 bg-gradient-to-r from-gray-600 to-gray-800"></div>

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
                            className={`flex-1 border-r-2 border-dashed border-gray-500 relative bg-gray-600 ${
                                (isCompleted || isCurrent || isFuture) && globalIndex > 0 ? 'shadow-inner' : ''
                            }`}
                            style={{
                                backgroundImage: (isCompleted && globalIndex > 0) ? `url(${cap2Image})` : ((isCurrent || isFuture) && globalIndex > 0) ? `url(${cap1Image})` : 'none',
                                backgroundSize: '60%',
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'center bottom',
                                opacity: (globalIndex === 4 && (isCurrent || isFuture)) ? 0.8 : 1
                            }}
                        >
                            {/* Show blockers only on completed lanes */}
                            {isCompleted && globalIndex > 0 && (
                                <div className="absolute top-0 left-0 right-0 h-8 flex items-center justify-center">
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
                                    <div className="bg-black bg-opacity-60 rounded-lg px-2 py-1 border border-gray-400">
                                        <span className="text-white font-bold text-sm drop-shadow-lg">
                                            {multiplier.toFixed(2)}x
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Chicken position indicator - only show if chicken is in visible range */}
            {currentIndex >= 0 && currentIndex < remainingMultipliers.length && (
                <div
                    className="absolute bottom-16 transform -translate-x-1/2 transition-all duration-300 ease-in-out"
                    style={{
                        left: `${((currentIndex + 0.5) / remainingMultipliers.length) * 100}%`
                    }}
                >
                    <Chicken 
                        isDead={isDead}
                        currentMultiplier={currentIndex > 0 ? remainingMultipliers[currentIndex] : null}
                        showMultiplier={currentIndex > 0}
                    />
                </div>
            )}


            {/* Moving cars for future lanes without blockers */}
            {generateMovingCars().map((car, carIndex) => (
                <DelayedCar
                    key={`moving-car-${car.globalIndex}`}
                    delay={car.delay}
                    left={`${((car.localIndex + 0.5) / remainingMultipliers.length) * 100}%`}
                    isAnimating={true}
                    isContinuous={true}
                />
            ))}

        </div>
    )
}

export default Lane
