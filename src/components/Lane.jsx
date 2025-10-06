import React, { useMemo, useEffect, useState } from 'react'
import finalSideRoadImage from '../assets/final.png'
import LaneTrack from './LaneTrack'
import LaneRow from './LaneRow'
import ChickenLayer from './ChickenLayer'
import { GAME_CONFIG } from '../utils/gameConfig'
import { useTraffic } from '../traffic/TrafficProvider'

function Lane({ remainingMultipliers, currentIndex, globalCurrentIndex, globalDisplayStart, allLanes, isDead = false, gameEnded = false, isJumping = false, jumpProgress = 0, jumpStartLane = 0, jumpTargetLane = 0, isRestarting = false, blockedNextLane = false, isValidatingNext = false, onCarBlockedStop = () => {}, crashVisualLane = -1, crashVisualTick = 0 }) {
    // Removed legacy carAnimationState; DynamicCar manages its own animation lifecycle.

    // Traffic via global engine context (independent of Lane re-renders)
    const traffic = useTraffic()
    const markCarDone = (laneIndex, carId) => traffic.markCarDone(laneIndex, carId)

  // On lane mount (which re-mounts on game reset via key), clear any lingering cars
  useEffect(() => {
    // Reset one-shot landing guard to allow showcase spawns again after restart
    // This is critical to prevent ghost cars across game sessions
    Lane._landingOnce = new Set()
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
            <LaneTrack
              totalLaneWidthPx={SIDEWALK_WIDTH_PX + (remainingMultipliers.length * LANE_WIDTH_PX)}
              laneTransformStyle={laneTransformStyle}
              isJumping={isJumping}
              jumpProgress={jumpProgress}
            >
              {laneStates.map(lane => (
                <LaneRow
                  key={lane.globalIndex}
                  lane={lane}
                  globalCurrentIndex={globalCurrentIndex}
                  allLanes={allLanes}
                  onCarBlockedStop={onCarBlockedStop}
                  markCarDone={markCarDone}
                  isJumping={isJumping}
                  traffic={traffic}
                />
              ))}

              {/* Chicken position indicator */}
              {((currentIndex >= 0 && currentIndex <= remainingMultipliers.length) || isJumping) && (
                <ChickenLayer
                  style={getChickenPosition()}
                  isDead={isDead}
                  currentMultiplier={globalCurrentIndex > 0 ? allLanes[globalCurrentIndex - 1] : null}
                  showMultiplier={globalCurrentIndex > 0}
                  isJumping={isJumping}
                  jumpProgress={jumpProgress}
                />
              )}
            </LaneTrack>

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
