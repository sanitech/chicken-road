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
import { useTraffic } from '../traffic/TrafficProvider'

function Lane({ remainingMultipliers, currentIndex, globalCurrentIndex, globalDisplayStart, allLanes, isDead = false, gameEnded = false, isJumping = false, jumpProgress = 0, jumpStartLane = 0, jumpTargetLane = 0, isRestarting = false, blockedNextLane = false, onCarBlockedStop = () => {}, crashVisualLane = -1, crashVisualTick = 0 }) {
    // Removed legacy carAnimationState; DynamicCar manages its own animation lifecycle.

    // Traffic via global engine context (independent of Lane re-renders)
    const traffic = useTraffic()
    const carsMap = traffic.getCarsMap()
    const markCarDone = (laneIndex, carId) => traffic.markCarDone(laneIndex, carId)

  // On lane mount (which re-mounts on game reset via key), clear any lingering cars
  useEffect(() => {
    // Reset one-shot landing guard to allow showcase spawns again after restart
    Lane._landingOnce = new Set()
    try { traffic.clearAllCars() } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Inform engine to suppress/resume spawns for ALL lanes based on blocker/crash state
  useEffect(() => {
    const referenceIndex = isJumping ? jumpStartLane : globalCurrentIndex
    const totalLanes = remainingMultipliers.length // lanes indexed 1..totalLanes
    for (let globalIndex = 1; globalIndex <= totalLanes; globalIndex++) {
      const isCompleted = globalIndex < referenceIndex
      const isCurrent = globalIndex === referenceIndex
      const baseBlocked = ((isCompleted && globalIndex > 0) || (isCurrent && globalIndex > 0))
      const isBlockedByServer = (globalIndex === globalCurrentIndex + 1) && isJumping && !!blockedNextLane
      const isCrashLane = (globalIndex === crashVisualLane)
      const computed = !isCrashLane && (baseBlocked || isBlockedByServer)
      try { traffic.setLaneBlocked(globalIndex, !!computed) } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingMultipliers.length, globalCurrentIndex, isJumping, jumpStartLane, blockedNextLane, crashVisualLane])

    // On crash signal from parent, inject a one-shot car into the crash lane for visual impact.
    useEffect(() => {
        if (typeof crashVisualLane === 'number' && crashVisualLane > 0 && crashVisualTick > 0) {
            // Inject a fast car to coincide with crash animation; duration roughly matches jump
            traffic.injectCrashCar(crashVisualLane, 900)
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

        // During jump: upward projection controlled from GAME_CONFIG
        const maxLiftPx = GAME_CONFIG.JUMP?.MAX_LIFT_PX ?? 50
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
                    background: GAME_CONFIG.COLORS.ASPHALT,
                    filter: isJumping ? `blur(${jumpProgress * 1}px)` : 'none',
                    opacity: 1,
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${SIDEWALK_WIDTH_PX + (remainingMultipliers.length * LANE_WIDTH_PX)}px`,
                    ...mainBackgroundOffset,
                    transition: 'none',
                    // Keep lanes below chicken; crash cars themselves render above via their own z-index
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
                    // Never show a blocker on the crash lane (visual car will handle the effect)
                    const isCrashLane = (globalIndex === crashVisualLane)
                    const computedHasBlocker = !isCrashLane && (baseBlocked || isBlockedByServer)
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
                                        {!(globalIndex === globalCurrentIndex) && (
                                          <img
                                            src={cap1Image}
                                            alt="Lane Cap"
                                            className="mx-auto object-contain"
                                            style={{ 
                                                objectPosition: GAME_CONFIG.CAP.OBJECT_POSITION,
                                                width: `${GAME_CONFIG.CAP.SIZE_PX}px`,
                                                height: `${GAME_CONFIG.CAP.SIZE_PX}px`,
                                                // Highlight only when the game has started and there is a real destination
                                                opacity: (globalCurrentIndex > 0 && isDestinationLane) ? 1 : 0.7,
                                                transition: 'opacity 150ms ease-in-out'
                                            }}
                                          />
                                        )}
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
                                                {(globalIndex !== globalCurrentIndex) && (
                                                  <text
                                                    x="50%"
                                                    y="50%"
                                                    textAnchor="middle"
                                                    dominantBaseline="middle"
                                                    fill={GAME_CONFIG.COLORS.BRIGHT_TEXT}
                                                    stroke="#000"
                                                    strokeWidth="3"
                                                    strokeLinejoin="round"
                                                    strokeLinecap="round"
                                                    paintOrder="stroke"
                                                    opacity={(globalCurrentIndex > 0 && isDestinationLane) ? "1" : "0.7"}
                                                    strokeOpacity={(globalCurrentIndex > 0 && isDestinationLane) ? "1" : "0.7"}
                                                    style={{ fontSize: `20px`, fontWeight: 700 }}
                                                >
                                                    {allLanes[globalIndex - 1]?.toFixed(2)}x
                                                  </text>
                                                )}
                                            </svg>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Smart car render for this lane (no client-side collision) */}
                            {(carsMap.get(globalIndex) || []).map(carData => (
                                <DynamicCar
                                    key={carData.id}
                                    carData={carData}
                                    hasBlocker={computedHasBlocker && !carData.isBlockedShowcase}
                                    onBlockedStop={onCarBlockedStop}
                                    onAnimationComplete={() => {
                                        // Mark car as done so cleanup can prune it
                                        markCarDone(globalIndex, carData.id)
                                    }}
                                />
                            ))}

                            {/* Blocker Image: do NOT render if a crash visual is active on this lane */}
                            {(globalIndex > 0 && computedHasBlocker && !(crashVisualLane === globalIndex)) && (
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
                            {/* Optional: trigger a blocked showcase car with configured probability when the chicken LANDS on this lane and it's blocked */}
                            {globalIndex > 0 && !isJumping && isCurrent && computedHasBlocker && typeof traffic.maybeSpawnBlockedShowcase === 'function' && (
                                (() => {
                                    // ONE-SHOT: attempt probabilistic injection only once per lane landing
                                    if (!Lane._landingOnce) Lane._landingOnce = new Set()
                                    const key = `land-block-${globalIndex}-${globalCurrentIndex}`
                                    if (!Lane._landingOnce.has(key)) {
                                        Lane._landingOnce.add(key)
                                        try { traffic.maybeSpawnBlockedShowcase(globalIndex) } catch {}
                                    }
                                    return null
                                })()
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
                    // Ensure cars layer above chicken after death
                    zIndex: isDead ? 1 : 10
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
