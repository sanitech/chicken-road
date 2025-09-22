// Centralized game configuration for layout and behavior tuning
// Edit these values to control sizing and positions without touching components.

export const GAME_CONFIG = {
  // Lane sizing
  LANE_WIDTH_PX: 140,           // Fixed width for each traffic lane (lane 1+)
  SIDEWALK_WIDTH_PX: 140,       // Width for the sidewalk (lane index 0)
  FINAL_SIDEWALK_WIDTH_PX: 400, // Width for the final sidewalk (lane index 0)

  // Chicken
  CHICKEN_SIZE_PX: 90,         // Default chicken size (width = height)
  // Chicken horizontal placement mode when at start and during jumps
  // 'boundary'  => align at sidewalk/lane-1 boundary (uses LANE_WIDTH_PX)
  // 'fixed_px'  => use CHICKEN_FIXED_X_PX from the left of the game area
  // 'percent'   => use CHICKEN_LEFT_PERCENT (left as percentage of container width)
  CHICKEN_X_MODE: 'fixed_px',
  CHICKEN_FIXED_X_PX: 70,      // Used only when CHICKEN_X_MODE === 'fixed_px'
  // Vertical placement baseline for the chicken (percentage of container height)
  CHICKEN_TOP_PERCENT: 60,

  // Car/blocker visuals

  // Absolute positioning controls (percentages are relative to lane column height)
  CAP: {
    // Size configuration for cap images
    SIZE_PX: 100,
    // Vertical position of the cap (grate), absolute within lane column
    TOP_PERCENT: 70, // default: align with CHICKEN_TOP_PERCENT
    // CSS object-position value for the cap image inside its lane column
    // Example: 'center bottom', 'center bottom 35%'
    OBJECT_POSITION: 'center bottom 35%',
  },

  BLOCKER: {
    // Size configuration for blocker images
    SIZE_PX: 120,
    // Prefer TOP_PERCENT; if omitted, code will fallback to CAR_BLOCKER_BOTTOM_PERCENT
    TOP_PERCENT: 40, // slightly above cap
  },

  // Where cars should stop (when blocked), as a top percent inside the lane column
  CAR: {
    // Size configuration for car images
    SIZE_PX: 100,
    STOP_TOP_PERCENT: 35, // slightly above blocker/cap
    // Spawn visual offset (px): cars start this many pixels above the lane area
    // so they appear to come in from above (behind the header)
    SPAWN_TOP_OFFSET_PX: 90,
  },

  // Parallax/scroll movement between lanes
  PARALLAX: {
    // Distance (in pixels) to move the lanes strip per lane of progress.
    // By default, keep in sync with LANE_WIDTH_PX. You can set a custom value
    // (e.g., smaller than lane width) for a tighter parallax effect.
    STEP_PX: 140,
  },

  // Car generation and movement tuning
  CAR_SPEED: {
    LANE_SPEED_PATTERN_MS: [2800, 2600, 2400, 2200, 2000],
    TRAFFIC_BASE_INTERVAL_MS: 2500,
    // Minimum allowed speed for cars (after jitter and multipliers)
    MIN_SPEED_MS: 700,
    // Global multiplier applied to per-lane base speeds (1.0 = unchanged, <1.0 = faster, >1.0 = slower)
    SPEED_MULTIPLIER: 1.1,
  },

  // Stochastic traffic configuration (irregular, realistic)
  TRAFFIC: {
    // Mean spawn interval per lane (ms). If array is shorter than lanes, last value repeats.
    // Acts as the parameter for exponential inter-arrival sampling.
    MEAN_INTERVAL_MS_BY_LANE: [2800, 3200, 3600, 4000, 4400],
    // Additional symmetric jitter (ms) applied to the sampled delay.
    ARRIVAL_JITTER_MS: 800,
    // Per-car speed jitter as a fraction (0.1 => ±10%).
    SPEED_JITTER_PERCENT: 0.1,
    // Minimum normalized progress (0..1) that the last car should reach before spawning another.
    HEADWAY_MIN_PROGRESS: 0.45,
    // Additionally require a minimum time gap relative to the last car's duration
    // Example: 0.35 means wait at least 35% of the last car's travel time
    HEADWAY_MIN_TIME_FRACTION: 0.40,
    // Maximum number of cars to actively render per lane for performance.
    MAX_CARS_PER_LANE_VISIBLE: 3,
    // Absolute minimum delay between spawns (ms), after jitter and randomness
    MIN_DELAY_MS: 1800,
    // Initial randomized offset (ms) for first spawn per lane: [min, max]
    INITIAL_OFFSET_RANGE_MS: [600, 1400],
    // Cleanup cadence for pruning finished cars (ms)
    CLEANUP_INTERVAL_MS: 1500,
    // Optional per-lane toggle to enable/disable spawning; indexes map to traffic lanes 1..N
    // Example: [true, true, false] disables lane 3 spawning. If shorter, remaining lanes default to true.
    PER_LANE_SPAWN_ENABLED: [],
    // Global multiplier for spawn frequency (1.0 = unchanged, <1.0 = more frequent, >1.0 = less frequent)
    SPAWN_RATE_MULTIPLIER: 1.0,
    // If true, enforce no-overlap strictly: when a lane is blocked or spacing isn't met,
    // keep at most 1 car in the lane queue until it's safe to spawn more.
    NO_OVERLAP_STRICT: true,
  },

  // Game restart tuning
  RESTART: {
    AUTO: true,
    DELAY_MS: 1500, // 1.5 second delay before auto-restart when chicken dies
  },
};
