import React, { useMemo, useEffect, useState } from 'react'
import cap1Image from '../assets/cap1.png'
import cap2Image from '../assets/cap2.png'
import blockerImage from '../assets/blocker.png'
import sideRoadImage from '../assets/sideroad.png'
import finalSideRoadImage from '../assets/final.png'
import Chicken from './Chicken'
import DynamicCar from './DynamicCar'
import { GAME_CONFIG } from '../utils/gameConfig'
import { useTraffic } from '../traffic/TrafficProvider'

function Lane({ remainingMultipliers, currentIndex, globalCurrentIndex, globalDisplayStart, allLanes, isDead = false, gameEnded = false, isJumping = false, jumpProgress = 0, jumpStartLane = 0, jumpTargetLane = 0, isRestarting = false, blockedNextLane = false, isValidatingNext = false, onCarBlockedStop = () => {}, crashVisualLane = -1, crashVisualTick = 0 }) {
    // Removed legacy carAnimationState; DynamicCar manages its own animation lifecycle.

    // Traffic via global engine context (independent of Lane re-renders)
    const traffic = useTraffic()
    const carsMap = traffic.getCarsMap()
    const markCarDone = (laneIndex, carId) => traffic.markCarDone(laneIndex, carId)

  // On lane mount (which re-mounts on game reset via key), clear any lingering cars
  useEffect(() => {
    // Reset one-shot landing guard to allow showcase spawns again after restart
    // This is critical to prevent ghost cars across game sessions
    Lane._landingOnce = new Set()
    console.log('[Lane] Resetting one-shot landing guard and clearing all cars')
    try { traffic.clearAllCars() } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Inform engine to suppress/resume spawns for ALL lanes based on blocker/crash state
  useEffect(() => {
    const totalLanes = remainingMultipliers.length // lanes indexed 1..totalLanes
    const currentIndex = globalCurrentIndex
    const jumpSpanStart = Math.min(jumpStartLane, jumpTargetLane)
    const jumpSpanEnd = Math.max(jumpStartLane, jumpTargetLane)

    for (let globalIndex = 1; globalIndex <= totalLanes; globalIndex++) {
      const isCompleted = globalIndex < currentIndex
      const isCurrent = globalIndex === currentIndex
      const isWithinJumpSpan = isJumping && globalIndex >= jumpSpanStart && globalIndex <= jumpSpanEnd
      const baseBlocked = (globalIndex > 0) && (isCompleted || isCurrent || isWithinJumpSpan)
      const isBlockedByServer = (globalIndex === globalCurrentIndex + 1) && isJumping && !!blockedNextLane
      // CRITICAL: Block next lane during validation (before jump starts) to prevent race conditions
      const isValidatingNextLane = (globalIndex === globalCurrentIndex + 1) && isValidatingNext
      const isCrashLane = (globalIndex === crashVisualLane)
      const computed = !isCrashLane && (baseBlocked || isBlockedByServer || isValidatingNextLane)
      try { traffic.setLaneBlocked(globalIndex, !!computed) } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingMultipliers.length, globalCurrentIndex, isJumping, jumpStartLane, jumpTargetLane, blockedNextLane, crashVisualLane, isValidatingNext])

    // On crash signal from parent, inject a one-shot car into the crash lane for visual impact.
    useEffect(() => {
        if (typeof crashVisualLane === 'number' && crashVisualLane > 0 && crashVisualTick > 0) {
            // Inject a crash car; use engine's default duration from config
            traffic.injectCrashCar(crashVisualLane)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [crashVisualTick])

    // Calculate chicken position - starts from side road
    const getChickenPosition = () => {
        const freezeLanes = GAME_CONFIG.PARALLAX?.FREEZE_LANES ?? 0
        const laneWidthPx = GAME_CONFIG.LANE_WIDTH_PX ?? 0

        // Helper: compute chicken left value based on config with optional px offset
        const getConfiguredLeft = (offsetPx = 0) => {
            const mode = GAME_CONFIG.CHICKEN_X_MODE
            if (mode === 'fixed_px') {
                return `${(GAME_CONFIG.CHICKEN_FIXED_X_PX ?? 0) + offsetPx}px`
            }
            if (mode === 'percent') {
                return `${GAME_CONFIG.CHICKEN_LEFT_PERCENT}%`
            }
            // 'boundary' -> align with sidewalk/lane-1 seam in px
            const boundaryBase = GAME_CONFIG.LANE_WIDTH_PX ?? 0
            return `${boundaryBase + offsetPx}px`
        }

        const clampFreezeLane = (lane) => {
            if (typeof lane !== 'number') return 0
            return Math.max(0, Math.min(freezeLanes, lane))
        }

        // Handle restart animation - smooth transition back to configured X position
        const counterTranslate = `translateX(${(-laneOffsetPx)}px)`

        if (isRestarting) {
            return {
                left: getConfiguredLeft(),
                top: `${GAME_CONFIG.CHICKEN_TOP_PERCENT}%`,
                transform: `${counterTranslate} translate(-50%, -50%)`,
                transition: 'all 1s ease-in-out' // Smooth 1-second animation
            }
        }

        if (!isJumping) {
            const clampedCurrentLane = clampFreezeLane(globalCurrentIndex)
            const offsetPx = laneWidthPx * clampedCurrentLane
            return {
                left: getConfiguredLeft(offsetPx),
                top: `${GAME_CONFIG.CHICKEN_TOP_PERCENT}%`,
                transform: `${counterTranslate} translate(-50%, -50%)`
            }
        }

        // During jump: projectile-style arc with landing dip
        const clampedProgress = Math.max(0, Math.min(1, jumpProgress))
        const maxLiftPx = GAME_CONFIG.JUMP?.MAX_LIFT_PX ?? 50
        const landingDipPx = GAME_CONFIG.JUMP?.LANDING_DIP_PX ?? 10

        const projectileCurve = 4 * clampedProgress * (1 - clampedProgress)
        const lift = projectileCurve * maxLiftPx

        const landingPhaseRaw = (clampedProgress - 0.7) / 0.3
        const landingPhase = Math.max(0, Math.min(1, landingPhaseRaw))
        const landingOffset = Math.sin(landingPhase * Math.PI) * landingDipPx

        const verticalOffset = -lift + landingOffset

        const easedHorizontalProgress = jumpProgress < 0.5
            ? 2 * jumpProgress * jumpProgress
            : 1 - Math.pow(-2 * jumpProgress + 2, 2) / 2
        const clampedStart = clampFreezeLane(jumpStartLane)
        const clampedTarget = clampFreezeLane(jumpTargetLane)
        const horizontalLanePosition = clampedStart + (clampedTarget - clampedStart) * easedHorizontalProgress
        const offsetPx = laneWidthPx * horizontalLanePosition

        return {
            left: getConfiguredLeft(offsetPx),
            top: `${GAME_CONFIG.CHICKEN_TOP_PERCENT}%`,
            transform: `${counterTranslate} translate(-50%, calc(-50% + ${verticalOffset}px))`,
            transition: 'none'
        }

    }

    // Helpers removed: lane visibility and spawn are managed in useTrafficGenerator

    // Widths from central config
    const LANE_WIDTH_PX = GAME_CONFIG.LANE_WIDTH_PX
    const SIDEWALK_WIDTH_PX = GAME_CONFIG.SIDEWALK_WIDTH_PX
    const FINAL_SIDEWALK_WIDTH_PX = GAME_CONFIG.FINAL_SIDEWALK_WIDTH_PX

    // Memoized background offset (parallax)
    const { laneTransformStyle, laneOffsetPx } = useMemo(() => {
        const freezeLanes = GAME_CONFIG.PARALLAX?.FREEZE_LANES ?? 0
        const baselineIndex = globalCurrentIndex - globalDisplayStart
        const clampedBaseline = Math.max(0, Math.min(remainingMultipliers.length, baselineIndex))
        const parallaxEligibleIndex = Math.max(0, clampedBaseline - freezeLanes)

        const easedProgress = isJumping
            ? (jumpProgress < 0.5
                ? 2 * jumpProgress * jumpProgress
                : 1 - Math.pow(-2 * jumpProgress + 2, 2) / 2)
            : 0

        const shouldAnimateParallax = (globalCurrentIndex >= freezeLanes)
        const effectiveProgress = shouldAnimateParallax ? easedProgress : 0
        const virtualIndex = parallaxEligibleIndex + effectiveProgress

        const offsetPx = -(virtualIndex * GAME_CONFIG.PARALLAX.STEP_PX)
        const totalPx = Math.round(offsetPx)
        return {
            laneOffsetPx: totalPx,
            laneTransformStyle: {
                transform: `translateX(${totalPx}px)`,
                transition: 'none'
            }
        }
    }, [remainingMultipliers.length, globalCurrentIndex, globalDisplayStart, isJumping, jumpProgress])

    const laneStates = useMemo(() => {
        return Array.from({ length: remainingMultipliers.length + 1 }).map((_, index) => {
            const globalIndex = globalDisplayStart + index
            const referenceIndex = isJumping ? jumpStartLane : globalCurrentIndex
            const isCompleted = globalIndex < referenceIndex
            const isCurrent = globalIndex === referenceIndex
            const isBlockedByServer = (globalIndex === globalCurrentIndex + 1) && isJumping && !!blockedNextLane
            const isCrashLane = (globalIndex === crashVisualLane)
            const isTransientBlock = isBlockedByServer && (isValidatingNext || jumpProgress < 0.05)
            const baseBlocked = ((isCompleted && globalIndex > 0) || (isCurrent && globalIndex > 0))
            const computedHasBlocker = !isCrashLane && !isTransientBlock && (baseBlocked || isBlockedByServer)
            const isDestinationLane = isJumping ? (globalIndex === jumpTargetLane) : (globalIndex === globalCurrentIndex + 1)
            const widthPx = globalIndex === 0 ? SIDEWALK_WIDTH_PX : LANE_WIDTH_PX

            return {
                index,
                globalIndex,
                widthPx,
                isSidewalk: globalIndex === 0,
                isCompleted,
                isCurrent,
                isCrashLane,
                isDestinationLane,
                computedHasBlocker
            }
        })
    }, [remainingMultipliers.length, globalDisplayStart, globalCurrentIndex, isJumping, jumpStartLane, jumpTargetLane, blockedNextLane, crashVisualLane, isValidatingNext, jumpProgress, LANE_WIDTH_PX, SIDEWALK_WIDTH_PX])
    
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
                    ...laneTransformStyle,
                    transition: 'none',
                    // Keep lanes below chicken; crash cars themselves render above via their own z-index
                    zIndex: GAME_CONFIG.Z_INDEX.LANE
                }}
            >
                {laneStates.map(lane => {
                    const { globalIndex, widthPx, isSidewalk, isCompleted, isCurrent, isCrashLane, isDestinationLane, computedHasBlocker } = lane

                    return (
                        <div
                            key={globalIndex}
                            className={`relative ${!isSidewalk ? 'flex items-end pb-52' : ''}`}
                            style={{ width: `${widthPx}px` }}
                        >
                            {/* Side Road Image Element - Full Control */}
                            {isSidewalk && (
                                <img
                                    src={sideRoadImage}
                                    alt="Side Road"
                                    className="w-full object-cover"
                                    style={{
                                        objectPosition: 'bottom center',
                                        zIndex: 1
                                    }}
                                />
                            )}

                            {/* Final side road will be rendered outside the last lane */}

                            {!isSidewalk && (
                                <>
                                    {/* Absolutely positioned lane cap tied to TOP_PERCENT */}
                                    <div
                                        className="absolute left-1/2 -translate-x-1/2 p-4"
                                        style={{
                                            top: `${GAME_CONFIG.CAP.TOP_PERCENT}%`,
                                            transform: 'translate(-50%, -50%)',
                                            zIndex: GAME_CONFIG.Z_INDEX.CAP,
                                            width: '100%',
                                            pointerEvents: 'none'
                                        }}
                                    >
                                        {!isCurrent && (
                                          <img
                                            src={globalIndex < globalCurrentIndex ? cap2Image : cap1Image}
                                            alt={globalIndex < globalCurrentIndex ? 'Completed Lane Cap' : 'Lane Cap'}
                                            className="mx-auto object-contain"
                                            style={{ 
                                                objectPosition: GAME_CONFIG.CAP.OBJECT_POSITION,
                                                width: `${GAME_CONFIG.CAP.SIZE_PX}px`,
                                                height: `${GAME_CONFIG.CAP.SIZE_PX}px`,
                                                opacity: isCompleted ? 0.9 : (globalCurrentIndex > 0 && isDestinationLane ? 1 : 0.7),
                                                transition: 'opacity 150ms ease-in-out'
                                            }}
                                          />
                                        )}
                                        {/* Multiplier centered inside cap */}
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                width={`${GAME_CONFIG.CAP.SIZE_PX}px`}
                                                height={`${GAME_CONFIG.CAP.SIZE_PX}px`}
                                                viewBox={`0 0 ${GAME_CONFIG.CAP.SIZE_PX} ${GAME_CONFIG.CAP.SIZE_PX}`}
                                                style={{ display: 'block' }}
                                                aria-hidden
                                            >
                                                {!isCurrent && (
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

                            {/* Blocker Image: NEVER render on crash lanes - crash car provides the visual */}
                            {(!isSidewalk && computedHasBlocker && !isCrashLane) && (
                                <div className="absolute left-0 right-0 h-8 flex items-center justify-center animate-fade-in"
                                     style={{ 
                                         top: `${GAME_CONFIG.BLOCKER.TOP_PERCENT}%`, 
                                         marginTop: '-1rem', /* Center vertically without transform */
                                         zIndex: GAME_CONFIG.Z_INDEX.BLOCKER 
                                     }}>
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
                            {/* NEVER spawn showcase blocker on crash lanes - crash car handles the visual */}
                            {!isSidewalk && !isJumping && isCurrent && computedHasBlocker && !isCrashLane && typeof traffic.maybeSpawnBlockedShowcase === 'function' && (
                                (() => {
                                    // ONE-SHOT: attempt probabilistic injection only once per lane landing
                                    // This is reset on game restart via useEffect above
                                    if (!Lane._landingOnce) Lane._landingOnce = new Set()
                                    const key = `land-block-${globalIndex}-${globalCurrentIndex}`
                                    if (!Lane._landingOnce.has(key)) {
                                        Lane._landingOnce.add(key)
                                        console.log(`[Lane] Attempting showcase blocker spawn for lane ${globalIndex} (not crash lane)`)
                                        try { 
                                            traffic.maybeSpawnBlockedShowcase(globalIndex)
                                        } catch (e) {
                                            console.error('[Lane] Error spawning showcase blocker:', e)
                                        }
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

                {/* Chicken position indicator - now inside transformed container to share stacking context with cars */}
                {((currentIndex >= 0 && currentIndex <= remainingMultipliers.length) || isJumping) && (
                    <div
                        className="absolute"
                        style={{
                            ...getChickenPosition(),
                            zIndex: GAME_CONFIG.Z_INDEX.CHICKEN
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
            </div>

            {/* Final Side Road Column outside the last lane: always render so it never disappears */}
            <div
                className="absolute"
                style={{
                    top: 0,
                    bottom: 0,
                    left: `${SIDEWALK_WIDTH_PX + (remainingMultipliers.length * LANE_WIDTH_PX)}px`,
                    width: `${FINAL_SIDEWALK_WIDTH_PX}px`,
                    ...laneTransformStyle,
                    zIndex: GAME_CONFIG.Z_INDEX.LANE
                }}
            >
                <img
                    src={finalSideRoadImage}
                    alt="Final Side Road"
                    className="w-full h-full object-cover"
                    style={{ objectPosition: 'top center' }}
                />
            </div>

            {/* Cars are now attached directly to their lanes above - no separate positioning needed */}

        </div>
    )
}

export default Lane
