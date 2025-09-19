// Centralized game configuration for layout and behavior tuning
// Edit these values to control sizing and positions without touching components.

export const GAME_CONFIG = {
  // Lane sizing
  LANE_WIDTH_PX: 160,           // Fixed width for each traffic lane (lane 1+)
  SIDEWALK_WIDTH_PX: 160,       // Width for the sidewalk (lane index 0)

  // Chicken
  CHICKEN_SIZE_PX: 90,         // Default chicken size (width = height)
  // Chicken horizontal placement mode when at start and during jumps
  // 'boundary'  => align at sidewalk/lane-1 boundary (uses LANE_WIDTH_PX)
  // 'fixed_px'  => use CHICKEN_FIXED_X_PX from the left of the game area
  // 'percent'   => use CHICKEN_LEFT_PERCENT (left as percentage of container width)
  CHICKEN_X_MODE: 'fixed_px',
  CHICKEN_FIXED_X_PX: 90,      // Used only when CHICKEN_X_MODE === 'fixed_px'
  // Vertical placement baseline for the chicken (percentage of container height)
  CHICKEN_TOP_PERCENT: 60,

  // Car/blocker visuals
  CAR_BLOCKER_BOTTOM_PERCENT: 60, // Legacy: Blocker vertical placement (distance from bottom in %)

  // Absolute positioning controls (percentages are relative to lane column height)
  CAP: {
    // Vertical position of the cap (grate), absolute within lane column
    TOP_PERCENT: 60, // default: align with CHICKEN_TOP_PERCENT
    // CSS object-position value for the cap image inside its lane column
    // Example: 'center bottom', 'center bottom 35%'
    OBJECT_POSITION: 'center bottom 35%',
  },

  BLOCKER: {
    // Prefer TOP_PERCENT; if omitted, code will fallback to CAR_BLOCKER_BOTTOM_PERCENT
    TOP_PERCENT: 30, // slightly above cap
    // If an existing car has already progressed beyond this fraction of its path
    // when the jump starts, do not interrupt it (let it finish).
    STOP_CUTOFF_PROGRESS: 0.6,
  },

  // Where cars should stop (when blocked), as a top percent inside the lane column
  CAR: {
    STOP_TOP_PERCENT: 20, // slightly above blocker/cap
    // Pause this much before STOP_TOP_PERCENT (as a fraction 0..1) to reduce visual snap
    STOP_EASE_DELTA: 0.05,
  },

  // Parallax/scroll movement between lanes
  PARALLAX: {
    // Distance (in pixels) to move the lanes strip per lane of progress.
    // By default, keep in sync with LANE_WIDTH_PX. You can set a custom value
    // (e.g., smaller than lane width) for a tighter parallax effect.
    STEP_PX: 160,
  },

  // Car generation and movement tuning
  CAR_SPEED: {
    CRASH_LANE_SPEED_MS: 1200,
    LANE_SPEED_PATTERN_MS: [2800, 2600, 2400, 2200, 2000],
    TRAFFIC_BASE_INTERVAL_MS: 2500,
    TRAFFIC_PER_LANE_INCREMENT_MS: 200,
    TRAFFIC_RANDOM_JITTER_MS: 1000,
  },

  // Audio (placeholders for easy tuning)
  AUDIO: {
    MASTER_VOLUME: 1.0,
    MUSIC_VOLUME: 0.3,
    SFX_VOLUME: 0.7,
  },
};
