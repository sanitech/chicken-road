import React, { useMemo, useEffect } from 'react'
import cap1Image from '../assets/cap1.png'
import blockerImage from '../assets/blocker.png'
import sideRoadImage from '../assets/sideroad.png'
import finalSideRoadImage from '../assets/final.png'
import Chicken from './Chicken'
import DynamicCar from './DynamicCar'
import car1 from '../assets/car1.png'
import car2 from '../assets/car2.png'
import car3 from '../assets/car3.png'
import car4 from '../assets/car4.png'
import { GAME_CONFIG } from '../utils/gameConfig'
import { useTrafficGenerator } from '../hooks/useTrafficGenerator'

function Lane({ remainingMultipliers, currentIndex, globalCurrentIndex, globalDisplayStart, allLanes, isDead = false, shouldAnimateCar = false, gameEnded = false, isJumping = false, jumpProgress = 0, jumpStartLane = 0, jumpTargetLane = 0, isRestarting = false, blockedNextLane = false, onCarBlockedStop = () => {}, crashVisualLane = -1, crashVisualTick = 0 }) {
    // Removed legacy carAnimationState; DynamicCar manages its own animation lifecycle.

    // Traffic generation via custom hook
    const carSprites = useMemo(() => [car1, car2, car3, car4], [])
    const { dynamicCars, markCarDone, addOneShotCar } = useTrafficGenerator({
        remainingMultipliers,
        globalDisplayStart,
        allLanes,
        isJumping,
        globalCurrentIndex,
        jumpStartLane,
        blockedNextLane,
        carSprites,
    })

    // On crash signal from parent, inject a one-shot car into the crash lane for visual impact.
    useEffect(() => {
        if (typeof crashVisualLane === 'number' && crashVisualLane > 0 && crashVisualTick > 0) {
            // Inject a fast car to coincide with crash animation; duration roughly matches jump
            addOneShotCar(crashVisualLane, 900)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [crashVisualTick])

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

    // Helpers removed: lane visibility and spawn are managed in useTrafficGenerator

    // Memoized background offset (parallax)
    const mainBackgroundOffset = useMemo(() => {
        const currentWithinWindow = Math.max(0, Math.min(remainingMultipliers.length, globalCurrentIndex - globalDisplayStart))
        const easedProgress = isJumping
            ? (jumpProgress < 0.5
                ? 2 * jumpProgress * jumpProgress
                : 1 - Math.pow(-2 * jumpProgress + 2, 2) / 2)
            : 0
        const virtualIndex = currentWithinWindow + easedProgress
        const offsetPx = -(virtualIndex * GAME_CONFIG.PARALLAX.STEP_PX)
        const totalPx = Math.round(offsetPx)
        return {
            transform: `translateX(${totalPx}px)`,
            transition: 'none'
        }
    }, [remainingMultipliers.length, globalCurrentIndex, globalDisplayStart, isJumping, jumpProgress])

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
                    ...mainBackgroundOffset,
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
                    // const isFuture = globalIndex > referenceIndex // not used

                    // Compute hasBlocker for this lane (prevents cars entering/stops cars)
                    const baseBlocked = ((isCompleted && globalIndex > 0) || (isCurrent && globalIndex > 0))
                    // Only show server blocker for the next lane once the jump has actually started
                    const isBlockedByServer = (globalIndex === globalCurrentIndex + 1) && isJumping && !!blockedNextLane
                    const computedHasBlocker = baseBlocked || isBlockedByServer
                    // Destination lane is where the chicken will land: during jump it's the jumpTargetLane,
                    // otherwise it's the immediate next lane from the current position
                    const isDestinationLane = isJumping ? (globalIndex === jumpTargetLane) : (globalIndex === globalCurrentIndex + 1)

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
                                            zIndex: 4,
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
                                                height: `${GAME_CONFIG.CAP.SIZE_PX}px`,
                                                opacity: isDestinationLane ? 1 : 0.7,
                                                transition: 'opacity 150ms ease-in-out'
                                            }}
                                        />
                                        {/* Multiplier centered inside cap */}
                                        <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 3 }}>
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                width={`${GAME_CONFIG.CAP.SIZE_PX}px`}
                                                height={`${GAME_CONFIG.CAP.SIZE_PX}px`}
                                                viewBox={`0 0 ${GAME_CONFIG.CAP.SIZE_PX} ${GAME_CONFIG.CAP.SIZE_PX}`}
                                                style={{ display: 'block' }}
                                                aria-hidden
                                            >
                                                <text
                                                    x="50%"
                                                    y="50%"
                                                    textAnchor="middle"
                                                    dominantBaseline="middle"
                                                    fill="#fff"
                                                    stroke="#000"
                                                    strokeWidth="3"
                                                    strokeLinejoin="round"
                                                    strokeLinecap="round"
                                                    paintOrder="stroke"
                                                    opacity="1"
                                                    strokeOpacity="1"
                                                    style={{ fontSize: `24px`, fontWeight: 900 }}
                                                >
                                                    {allLanes[globalIndex - 1]?.toFixed(2)}x
                                                </text>
                                            </svg>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Smart car for this specific lane - with chicken collision detection */}
                            {(dynamicCars.get(globalIndex) || []).map(carData => (
                                <DynamicCar
                                    key={carData.id}
                                    carData={carData}
                                    hasBlocker={computedHasBlocker}
                                    onBlockedStop={onCarBlockedStop}
                                    onAnimationComplete={() => {
                                        // Mark car as done so cleanup can prune it
                                        markCarDone(globalIndex, carData.id)
                                    }}
                                />
                            ))}

                            {/* Blocker Image visible when lane is base blocked, reservation pause, or server says next lane is blocked */}
                            {(globalIndex > 0 && computedHasBlocker) && (
                                <div className="absolute left-0 right-0 h-8 flex items-center justify-center animate-fade-in"
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
                    ...mainBackgroundOffset,
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
