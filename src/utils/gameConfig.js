// Centralized game configuration for layout and behavior tuning
// Edit these values to control sizing and positions without touching components.

// Screen size presets for different viewport dimensions
const SCREEN_PRESETS = {
  STANDARD: {
    LANE_WIDTH_PX: 120,
    SIDEWALK_WIDTH_PX: 120,
    FINAL_SIDEWALK_WIDTH_PX: 400,
    PARALLAX_STEP_PX: 120,
    PARALLAX_FREEZE_LANES: 0,
    JUMP_MAX_LIFT_PX: 50,
    JUMP_LANDING_DIP_PX: 10,
    CHICKEN_WIDTH_PX: 100,
    CHICKEN_HEIGHT_PX: 100,
    CHICKEN_FIXED_X_PX: 70,
    CAP_SIZE_PX: 85,
    BLOCKER_SIZE_PX: 150,
    CAR_SIZE_PX: 140,
    CAR_SPAWN_OFFSET_PX: 350,
    CAR_EXIT_OFFSET_PX: 200,
    CAR_STOP_TOP_PERCENT: 8, // stop point for blocked cars inside lane
  },
  LARGE: {
    LANE_WIDTH_PX: 160,           // +33% wider lanes
    SIDEWALK_WIDTH_PX: 160,       // +33% wider sidewalk
    FINAL_SIDEWALK_WIDTH_PX: 500, // +25% wider final area
    PARALLAX_STEP_PX: 160,        // +33% larger parallax displacement
    PARALLAX_FREEZE_LANES: 2,     // Hold background until after lane 2
    JUMP_MAX_LIFT_PX: 55,
    JUMP_LANDING_DIP_PX: 16,
    CHICKEN_WIDTH_PX: 130,        // +30% larger chicken
    CHICKEN_HEIGHT_PX: 130,       // +30% larger chicken
    CHICKEN_FIXED_X_PX: 90,       // +28% adjusted position
    CAP_SIZE_PX: 110,             // +29% larger cap
    BLOCKER_SIZE_PX: 190,         // +27% larger blocker
    CAR_SIZE_PX: 160,             // +29% larger cars
    CAR_SPAWN_OFFSET_PX: 450,     // +29% larger spawn offset
    CAR_EXIT_OFFSET_PX: 260,      // +30% larger exit offset
    CAR_STOP_TOP_PERCENT: 6,      // stop point for blocked cars inside lane
  },
};

// Responsive screen size detection
// Breakpoint: screens wider than this use LARGE preset
const LARGE_SCREEN_BREAKPOINT_PX = 1000;

// Function to get active screen preset based on viewport width
export function getActiveScreenPreset() {
  const width = typeof window !== 'undefined' ? window.innerWidth : 1920;
  return width >= LARGE_SCREEN_BREAKPOINT_PX ? 'LARGE' : 'STANDARD';
}

// Initial screen detection
const ACTIVE_SCREEN = getActiveScreenPreset();
const SCREEN = SCREEN_PRESETS[ACTIVE_SCREEN];

// Export presets and breakpoint for reference
export { SCREEN_PRESETS, LARGE_SCREEN_BREAKPOINT_PX };

// Debug log to verify which screen config is active
console.log(`[GameConfig] Active screen size: ${ACTIVE_SCREEN} (viewport: ${typeof window !== 'undefined' ? window.innerWidth : 'SSR'}px)`, {
  laneWidth: SCREEN.LANE_WIDTH_PX,
  chickenSize: SCREEN.CHICKEN_WIDTH_PX,
  carSize: SCREEN.CAR_SIZE_PX,
  breakpoint: LARGE_SCREEN_BREAKPOINT_PX,
});

export const GAME_CONFIG = {
  // Screen configuration
  SCREEN_SIZE: ACTIVE_SCREEN,
  
  // Lane sizing (from screen preset)
  LANE_WIDTH_PX: SCREEN.LANE_WIDTH_PX,
  SIDEWALK_WIDTH_PX: SCREEN.SIDEWALK_WIDTH_PX,
  FINAL_SIDEWALK_WIDTH_PX: SCREEN.FINAL_SIDEWALK_WIDTH_PX,

  // Color scheme
  COLORS: {
    // Road elements
    ASPHALT: '#716c69',
    DASHES: '#d4d0cb',
    
    // UI backgrounds
    BACKGROUND: '#424242',
    ELEVATED: '#555555',
    MORE_ELEVATED: '#646464',
    
    // Button colors
    PLAY_BUTTON: '#3dc45b',
    CASHOUT_BUTTON: '#fecf4b',
    
    // Text colors
    BRIGHT_TEXT: '#fefffe',
    SECONDARY_TEXT: '#a6a6a6',
    TERTIARY_TEXT: '#797979',
    
    // Shadow colors (similar grays)
    SHADOW_LIGHT: '#2a2a2a',
    SHADOW_MEDIUM: '#1a1a1a',
    SHADOW_DARK: '#0f0f0f'
  },

  // Chicken (from screen preset)
  CHICKEN_WIDTH_PX: SCREEN.CHICKEN_WIDTH_PX,
  CHICKEN_HEIGHT_PX: SCREEN.CHICKEN_HEIGHT_PX,
  // Jump animation controls
  JUMP: {
    DURATION_MS: 350,          // total time of a jump
    MAX_LIFT_PX: SCREEN.JUMP_MAX_LIFT_PX ?? 35,           // peak vertical lift during jump
    LANDING_DIP_PX: SCREEN.JUMP_LANDING_DIP_PX ?? 10,
  },
  // Chicken horizontal placement mode when at start and during jumps
  // 'boundary'  => align at sidewalk/lane-1 boundary (uses LANE_WIDTH_PX)
  // 'fixed_px'  => use CHICKEN_FIXED_X_PX from the left of the game area
  // 'percent'   => use CHICKEN_LEFT_PERCENT (left as percentage of container width)
  CHICKEN_X_MODE: 'fixed_px',
  CHICKEN_FIXED_X_PX: SCREEN.CHICKEN_FIXED_X_PX,
  // Vertical placement baseline for the chicken (percentage of container height)
  CHICKEN_TOP_PERCENT: 70,

  // Car/blocker visuals

  // Absolute positioning controls (percentages are relative to lane column height)
  CAP: {
    // Size configuration for cap images (from screen preset)
    SIZE_PX: SCREEN.CAP_SIZE_PX,
    // Vertical position of the cap (grate), absolute within lane column
    TOP_PERCENT: 70, // default: align with CHICKEN_TOP_PERCENT
    // CSS object-position value for the cap image inside its lane column
    // Example: 'center bottom', 'center bottom 35%'
    OBJECT_POSITION: 'center bottom 35%',
  },

  BLOCKER: {
    // Size configuration for blocker images (from screen preset)
    SIZE_PX: SCREEN.BLOCKER_SIZE_PX,
    // Prefer TOP_PERCENT; if omitted, code will fallback to CAR_BLOCKER_BOTTOM_PERCENT
    TOP_PERCENT: 40, // slightly above cap
  },

  // Where cars should stop (when blocked), as a top percent inside the lane column
  CAR: {
    // Size configuration for car images (from screen preset)
    SIZE_PX: SCREEN.CAR_SIZE_PX,
    STOP_TOP_PERCENT: SCREEN.CAR_STOP_TOP_PERCENT, // stop point for blocked cars inside lane
    // Spawn visual offset (px): cars start this many pixels above the lane area
    // so they appear to come in from above (behind the header)
    SPAWN_TOP_OFFSET_PX: SCREEN.CAR_SPAWN_OFFSET_PX,
    // Exit visual offset (px): cars continue this many pixels below the lane area
    // before disappearing, so they appear to exit below the visible area
    EXIT_TOP_OFFSET_PX: SCREEN.CAR_EXIT_OFFSET_PX,
  },

  // Parallax/scroll movement between lanes
  PARALLAX: {
    // Distance (in pixels) to move the lanes strip per lane of progress (from screen preset)
    // By default, keep in sync with LANE_WIDTH_PX. You can set a custom value
    // (e.g., smaller than lane width) for a tighter parallax effect.
    STEP_PX: SCREEN.PARALLAX_STEP_PX,
    FREEZE_LANES: SCREEN.PARALLAX_FREEZE_LANES ?? 0,
  },

  // Car speed model (how fast each car travels from spawn to exit)
  CAR_SPEED: {
    // Base duration per lane (ms) for a car to travel its path, before jitter/multipliers.
    // Smaller number => faster cars.
    // Index mapping examples:
    //   index 0 => lane 1 (closest road lane)
    //   index 1 => lane 2
    //   index 2 => lane 3 ...
    // If there are more lanes than entries, the last value repeats for all remaining lanes.
    LANE_SPEED_PATTERN_MS: [2600, 2800, 3000, 3200, 3400],
    // Fallback base interval used only if MEAN_INTERVAL_MS_BY_LANE is missing for a lane in Traffic.
    // You can remove or ignore this; TrafficEngine also has a hardcoded fallback.
    TRAFFIC_BASE_INTERVAL_MS: 2500,
    // Clamp: never let a car be faster than this duration (ms) after all modifiers.
    MIN_SPEED_MS: 900,
    // Clamp: never let a car be slower than this duration (ms) after all modifiers.
    // Example: 5000 => cap travel duration at 5s max to avoid excessive waiting.
    MAX_SPEED_MS: 3400,
    // Global knob to slow down or speed up ALL lanes at once.
    // 1.0 = unchanged, <1.0 = faster (shorter durations), >1.0 = slower (longer durations)
    // Example: 1.15 => all cars take 15% longer to travel (appear slower)
    //          0.85 => all cars take 15% less time (appear faster)
    SPEED_MULTIPLIER: 0.8,
  },

  // Traffic spawning model (when new cars appear)
  TRAFFIC: {
    // Per-lane average spawn interval (ms). Shorter => more cars (denser traffic).
    // Exponential sampling is used, so this is the mean of a random distribution.
    // Index mapping examples:
    //   [m0, m1, m2, m3, m4]
    //    m0 => lane 1, m1 => lane 2, ...
    // Lanes beyond the list use the last value (m4).
    // Tip: Equal steps (e.g., +400ms per lane) create a smooth gradient of density.
    MEAN_INTERVAL_MS_BY_LANE: [7000, 5000, 3000, 1000, 9000],
    // Adds random noise to spawn timing (ms). Larger => more irregular spacing.
    // Example: 1500 => each spawn delay is shifted by up to ~±1.5s randomness.
    // Keep small for calmer traffic; increase to avoid patterns.
    ARRIVAL_JITTER_MS: 1500,
    // Random jitter applied to each car's speed (duration).
    // 0.2 => ±20% range around the lane's base duration after multipliers.
    // Example: base 3000ms with 0.2 => samples roughly in [2400..3600]ms.
    SPEED_JITTER_PERCENT: 0.6,
    // Do not spawn a new car until the last car reaches this fraction of its journey (0..1).
    // Higher => larger gaps, safer crossings. Example: 0.75 => wait until 75% progressed.
    HEADWAY_MIN_PROGRESS: 0.80,
    // Also require a minimum time gap relative to the last car's duration (0..1 fraction).
    // Example: 0.50 => at least 50% of the last car's travel time must elapse before spawning next.
    // Works together with HEADWAY_MIN_PROGRESS; both must be satisfied.
    HEADWAY_MIN_TIME_FRACTION: 0.50,
    // Hard cap for how many active cars are allowed per lane at once (perf and readability).
    MAX_CARS_PER_LANE_VISIBLE: 1,
    // Never spawn faster than this absolute floor (ms), regardless of randomness.
    // Example: with MIN_DELAY_MS = 2200, even if the mean and jitter suggest 1500ms,
    // we will wait at least 2200ms before the next spawn.
    MIN_DELAY_MS: 10000,
    // First spawn per lane starts after a random delay within this range (ms).
    // Example: [800, 1600] => the very first spawn per lane happens 0.8–1.6s after start.
    // This prevents all lanes from spawning simultaneously after a reset.
    INITIAL_OFFSET_RANGE_MS: [800, 1600],
    // How often the engine prunes finished cars (ms). Purely performance/cleanup.
    CLEANUP_INTERVAL_MS: 1500,
    // Optional per-lane enable/disable toggles (index 0 => lane 1).
    // Example: [true, true, false] disables spawning in lane 3; omitted lanes default to enabled.
    PER_LANE_SPAWN_ENABLED: [],
    // Global knob to scale spawn frequency across all lanes.
    // 1.0 = unchanged, <1.0 = more frequent (denser), >1.0 = less frequent (sparser)
    // Example: 1.2 => all lanes spawn ~20% less often; 0.8 => ~20% more often.
    SPAWN_RATE_MULTIPLIER: 1.2,
    // When true, keep at most one car queued if spacing is not safe or lane is blocked (prevents overlap).
    NO_OVERLAP_STRICT: true,
    // Configuration for the visual "blocker" car that stops in a lane when blocked.
    BLOCKED_SHOWCASE: {
      // Probability (0..1) to spawn a blocker when a lane becomes blocked.
      PROBABILITY_PER_BLOCK: 0.5,
    },
  },

  // Game restart tuning
  RESTART: {
    AUTO: true,
    DELAY_MS: 1500, // 1.5 second delay before auto-restart when chicken dies
  },

  // Crash car configuration
  CRASH: {
    DURATION_MS: 1200, // How fast crash cars accelerate out of the lane (higher = slower)
    // Delay after jump before showing dead chicken sprite (ms)
    // Should be: JUMP.DURATION_MS + time for crash car to reach chicken position
    // Example: 350ms jump + 450ms car travel = 800ms total
    IMPACT_DELAY_MS: 1000,
  },

  // Jump validation - wait for lane to be empty before jumping
  JUMP_VALIDATION: {
    // How often to check if destination lane is empty (milliseconds)
    POLL_INTERVAL_MS: 20,
    // Maximum time to wait for lane to clear before forcing jump (milliseconds)
    MAX_WAIT_MS: 10000,
    // When chicken clicks GO, boost any waiting car to exit in this duration (milliseconds)
    // Lower = faster exit, less waiting. 700ms = very fast, 1000ms = moderate
    BOOST_DURATION_MS: 700,
    // If car is already past this progress (0.0-1.0), skip boost and jump immediately
    // 0.65 = 65% done, close enough to just wait naturally. Lower = boost more aggressively
    MIN_PROGRESS_TO_SKIP_BOOST: 0.65,
  },
};
