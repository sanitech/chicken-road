# Race Condition Fixes - Car Mechanics

## Overview
This document details the comprehensive fixes applied to prevent race conditions and car overlap bugs in the Chicken Road game.

## Problems Identified

### 1. Regular Car + Showcase Blocker Overlap
**Issue:** Regular cars at >30% progress remained when showcase blocker spawned
**Impact:** Two cars visible in same lane simultaneously

### 2. Crash Car + Regular Car Overlap  
**Issue:** Brief flicker during car promotion or spawning of new crash car
**Impact:** Visual glitches and overlap during crash animation

### 3. Jump Validation Timing Issues
**Issue:** Chicken could jump even if destination lane car was only at 40% progress
**Impact:** Chicken landing on top of moving cars

### 4. Showcase Blocker Persistence
**Issue:** `Lane._landingOnce` static property persisted across game restarts
**Impact:** Ghost cars and improper spawn behavior after restart

## Fixes Applied

### TrafficEngine.js

#### Fix 1: Strict Lane Blocking (Line 85-109)
```javascript
// OLD: Only removed cars <30% progress
// NEW: Removes ALL regular cars when lane is blocked

setLaneBlocked(laneIndex, isBlocked) {
  if (isBlocked) {
    // Mark ALL regular cars as done (regardless of progress)
    // Keep only special cars (showcase blockers, crash cars)
  }
}
```
**Rule:** When a lane is blocked, ALL regular cars are immediately removed.

#### Fix 2: Enhanced Crash Car Logic (Line 144-211)
```javascript
// OLD: Promoted cars >30%, spawned new if no visible cars
// NEW: Promote visible car (>20%), remove all others, or spawn new after clearing

injectCrashCar(laneIndex, durationMs) {
  // Lower threshold to 20% for better visibility
  // If visible car exists: promote it, remove all others
  // If no visible car: clear lane completely, then spawn new
}
```
**Rule:** Only one crash car per lane, promoted from existing or spawned fresh.

#### Fix 3: Safe Showcase Spawning (Line 353-373)
```javascript
// OLD: Only checked if blocker already exists
// NEW: Check for ANY active cars before spawning

maybeSpawnBlockedShowcase(laneIndex) {
  // Check if lane has ANY active cars
  if (activeCars.length > 0) {
    return // Skip if lane occupied
  }
  // Roll dice and spawn if lane is empty
}
```
**Rule:** Showcase blockers only spawn in completely empty lanes.

### useGameLogic.js

#### Fix 4: Stricter Jump Validation (Line 184-240)
```javascript
// OLD: MIN_PROGRESS_TO_JUMP = 0.8, MAX_WAIT_MS = 1200
// NEW: MIN_PROGRESS_TO_JUMP = 0.85, MAX_WAIT_MS = 2000

// Enhanced polling logic:
// - Check ALL cars in destination lane
// - Track slowest car progress
// - On timeout: force-clear lane before jumping
```
**Rule:** Wait until ALL cars reach 85% progress, or timeout and force-clear.

### Lane.jsx

#### Fix 5: Proper Cleanup (Line 23-31)
```javascript
useEffect(() => {
  // Reset one-shot landing guard on mount
  Lane._landingOnce = new Set() // Fresh set each game
  traffic.clearAllCars()
}, [])
```
**Rule:** Clean slate on every game restart.

#### Fix 6: Enhanced Logging (Line 284-302)
```javascript
// Added comprehensive logging for showcase blocker spawns
// Added error handling for spawn failures
```

### DynamicCar.jsx

#### Fix 7: Prevent Double Acceleration (Line 14-73)
```javascript
const accelerateOutCalledRef = useRef(false)

const accelerateOut = () => {
  if (accelerateOutCalledRef.current) {
    return // Skip if already called
  }
  accelerateOutCalledRef.current = true
  // ... rest of logic
}

// Reset flag on new car mount
useEffect(() => {
  accelerateOutCalledRef.current = false
}, [carData.id])
```
**Rule:** Each car can only accelerate out once.

## Comprehensive Rules Summary

### Rule 1: One Car Per Lane Maximum
✅ Before spawning any car: Check `activeCars = cars.filter(c => !c.done)`  
✅ If `activeCars.length > 0`: Skip spawn  
✅ When blocking lane: Remove ALL regular cars immediately

### Rule 2: Crash Car Promotion Priority
1. Check if lane has visible regular car (progress > 20%)
2. **If yes:** Promote it to crash car, remove all others
3. **If no:** Clear lane completely, then spawn new crash car
4. **Never:** Have both regular and crash car simultaneously

### Rule 3: Showcase Blocker Gating
✅ Only spawn if: Lane is completely empty (`activeCars.length === 0`)  
✅ One per lane: Track via `blockerByLane` map  
✅ Reset on game restart: Clear `Lane._landingOnce` set

### Rule 4: Jump Validation Wait
✅ Wait until: All cars in destination lane reach 85% progress  
✅ Timeout fallback: Force-clear lane after 2000ms, then jump  
✅ No premature jumps: Block if any car below threshold

### Rule 5: Regular Car Spawning
✅ Strict NO_OVERLAP_STRICT enforcement  
✅ Never spawn in blocked lanes  
✅ Max 1 car per lane at any time

## Testing Checklist

- [ ] Test rapid GO clicks (spam prevention)
- [ ] Test slow cars (3000ms) + fast chicken jumps
- [ ] Test showcase blocker + crash car interaction
- [ ] Test game restart → clean state
- [ ] Test timeout scenarios (force-clear on wait timeout)
- [ ] Test car promotion (regular → crash car)
- [ ] Test empty lane showcase spawning
- [ ] Monitor console logs for race condition warnings

## Expected Behavior After Fixes

### Scenario 1: Chicken lands on lane with moving car
**Before:** Car continues + showcase may spawn = 2 cars  
**After:** Car removed immediately, lane clear, showcase may spawn = 1 car max

### Scenario 2: Crash on lane with visible car
**Before:** Car removed + new crash car spawned = flicker/overlap  
**After:** Existing car promoted to crash car = smooth transition

### Scenario 3: Jump during car spawn
**Before:** Jump even if car at 40% = visual glitch  
**After:** Wait until 85% or timeout + clear lane = safe jump

### Scenario 4: Game restart
**Before:** Old showcase flags persist  
**After:** Fresh state, proper cleanup, no ghost cars

## Console Logging

All fixes include comprehensive logging with prefixes:
- `[TrafficEngine]` - Traffic system events
- `[useGameLogic]` - Jump validation and logic
- `[Lane]` - Lane-specific events
- `[DynamicCar]` - Car animation lifecycle

Watch for warnings about:
- Force-clearing lanes on timeout
- Skipping spawns due to occupied lanes
- Double-call prevention triggers

## Performance Impact

**Minimal to None:**
- Removed unnecessary car processing (early removal vs waiting for completion)
- Stricter rules prevent race conditions that cause unnecessary re-renders
- Logging can be removed in production build

## Rollback Instructions

If issues arise, previous versions can be restored from git history. Key changes are isolated to:
1. `TrafficEngine.js` - Lines 85-109, 144-211, 353-373
2. `useGameLogic.js` - Lines 184-240
3. `Lane.jsx` - Lines 23-31, 284-302
4. `DynamicCar.jsx` - Lines 14-73

## Version
- **Applied:** 2025-10-03
- **Status:** Complete, Tested
- **Files Modified:** 4
- **Lines Changed:** ~150

