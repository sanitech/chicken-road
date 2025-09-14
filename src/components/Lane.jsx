import React, { useState, useEffect } from 'react'
import cap1Image from '../assets/cap1.png'
import cap2Image from '../assets/cap2.png'
import blockerImage from '../assets/blocker.png'
import Chicken from './Chicken'
import Car from './Car'

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

    // Generate moving cars for all lanes except current lane and cap2 lanes
    const generateMovingCars = () => {
        const movingCars = []
        
        remainingMultipliers.forEach((multiplier, index) => {
            
            const globalIndex = globalDisplayStart + index
            const isCurrentLane = globalIndex === globalCurrentIndex
            const isCrashLane = globalIndex === crashIndex - 1 // Crash lane where chicken dies
            const isCompleted = globalIndex < globalCurrentIndex
            const isCap2Lane = isCompleted && globalIndex > 0 // Lanes with cap2 background
            
            // Add moving car if it's not the current lane (unless current lane is crash index - 1), and not a cap2 lane
            // Now allow moving cars on crash lane
            const isCurrentLaneAtCrashMinus1 = isCurrentLane && globalCurrentIndex === crashIndex - 1
            if ((!isCurrentLane || isCurrentLaneAtCrashMinus1) && !isCap2Lane && globalIndex > 0) {
                // Calculate delay based on distance from current lane
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
        <div className="relative w-full h-64 bg-gray-700 overflow-hidden">
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
                            className={`flex-1 border-r-2 border-dashed border-gray-500 relative bg-gray-600`}
                            style={{
                                backgroundImage: (isCompleted && globalIndex > 0) ? `url(${cap2Image})` : ((isCurrent || isFuture) && globalIndex > 0) ? `url(${cap1Image})` : 'none',
                                backgroundSize: '60%',
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'center',
                                opacity: (globalIndex === 4 && (isCurrent || isFuture)) ? 0.8 : 1
                            }}
                        >
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
                            {(isCompleted || isFuture) && globalIndex > 0 && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-white font-bold text-xs">
                                        {multiplier.toFixed(2)}x
                                    </span>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Chicken position indicator - only show if chicken is in visible range */}
            {currentIndex >= 0 && currentIndex < remainingMultipliers.length && (
                <div
                    className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 transition-all duration-300 ease-in-out"
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

            {/* Car at crash index - 1 - only show if crash index - 1 is in visible range */}
            {crashIndex - 1 >= globalDisplayStart && crashIndex - 1 < globalDisplayStart + remainingMultipliers.length && (
                <div
                    className="absolute top-0 transform -translate-x-1/2"
                    style={{
                        left: `${((crashIndex - 1 - globalDisplayStart + 0.5) / remainingMultipliers.length) * 100}%`
                    }}
                >
                    <Car 
                        isAnimating={true}
                        isContinuous={true}
                        onAnimationComplete={handleCarAnimationComplete}
                    />
                </div>
            )}

            {/* Moving cars for future lanes without blockers */}
            {generateMovingCars().map((car, carIndex) => (
                <div
                    key={`moving-car-${car.globalIndex}`}
                    className="absolute top-0 transform -translate-x-1/2"
                    style={{
                        left: `${((car.localIndex + 0.5) / remainingMultipliers.length) * 100}%`,
                        animationDelay: `${car.delay}ms`
                    }}
                >
                    <Car 
                        isAnimating={true}
                        isContinuous={true}
                        onAnimationComplete={() => {}} // No completion handler needed for moving cars
                    />
                </div>
            ))}

        </div>
    )
}

export default Lane
