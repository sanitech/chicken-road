import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useGetUserInfo } from '../utils/getUserinfo'
import gameApi from '../utils/gameApi'
import socketGameAPI from '../utils/socketApi'
import { FaCoins, FaCog } from 'react-icons/fa'
import { Howl, Howler } from 'howler'
import logoImage from '../assets/logo.png'
import deadChickenImage from '../assets/chickendead.png'
import backgroundMusic from '../assets/audio/ChickenRoadClient.webm'
import cashoutAudio from '../assets/audio/cashout.a30989e2.mp3'
import crashAudio from '../assets/audio/crash.6d250f25.mp3'
import buttonClickAudio from '../assets/audio/buttonClick.mp3'
import jumpAudio from '../assets/audio/chick.ffd1f39b.mp3'
import winNotificationImage from '../assets/winNotification.aba8bdcf.png'
import Lane from './Lane'
import cap1Image from '../assets/cap1.png'
import cap2Image from '../assets/cap2.png'
import blockerImage from '../assets/blocker.png'
import sideRoadImage from '../assets/sideroad.png'
import car1 from '../assets/car1.png'
import car2 from '../assets/car2.png'
import car3 from '../assets/car3.png'
import car4 from '../assets/car4.png'
import { preloadImages } from '../utils/preloadAssets'
import { GAME_CONFIG } from '../utils/gameConfig'
import { TrafficProvider } from '../traffic/TrafficProvider'
import trafficEngine from '../traffic/TrafficEngine'
// Generate lanes based on difficulty configuration
const generateLanesForDifficulty = (difficultyConfigs, difficulty = 'easy') => {
  const config = difficultyConfigs[difficulty]
  return [...config.multipliers] // Return a copy of the multipliers array
}

// Game Audio Manager using Howler.js
class GameAudioManager {
  constructor() {
    this.backgroundMusic = new Howl({
      src: [backgroundMusic],
      loop: true,
      volume: 0.3,
      autoplay: false, // We'll control this manually
      onload: () => console.log('Background music loaded'),
      onplay: () => console.log('Background music started'),
      onpause: () => console.log('Background music paused'),
      onerror: (id, error) => console.log('Background music error:', error)
    })

    this.cashoutSound = new Howl({
      src: [cashoutAudio],
      volume: 0.7,
      onload: () => console.log('Cashout sound loaded'),
      onplay: () => console.log('Cashout sound played'),
      onerror: (id, error) => console.log('Cashout sound error:', error)
    })

    this.crashSound = new Howl({
      src: [crashAudio],
      volume: 0.6,
      onload: () => console.log('Crash sound loaded'),
      onplay: () => console.log('Crash sound played'),
      onerror: (id, error) => console.log('Crash sound error:', error)
    })

    this.buttonClickSound = new Howl({
      src: [buttonClickAudio],
      volume: 0.5,
      onload: () => console.log('Button click sound loaded'),
      onplay: () => console.log('Button click sound played'),
      onerror: (id, error) => console.log('Button click sound error:', error)
    })

    this.jumpSound = new Howl({
      src: [jumpAudio],
      volume: 0.4,
      onload: () => console.log('Jump sound loaded'),
      onplay: () => console.log('Jump sound played'),
      onerror: (id, error) => console.log('Jump sound error:', error)
    })
  }

  // Background music controls
  playBackgroundMusic() {
    if (!this.backgroundMusic.playing()) {
      this.backgroundMusic.play()
    }
  }

  pauseBackgroundMusic() {
    this.backgroundMusic.pause()
  }

  // Sound effects
  playCashout() {
    this.cashoutSound.play()
  }

  playCrash() {
    this.crashSound.play()
  }

  playButtonClick() {
    this.buttonClickSound.play()
  }

  playJump() {
    this.jumpSound.play()
  }

  // Master controls
  setMasterVolume(volume) {
    Howler.volume(volume)
  }

  setSoundEffectsEnabled(enabled) {
    this.soundEffectsEnabled = enabled
  }

  setMusicEnabled(enabled) {
    if (enabled) {
      this.playBackgroundMusic()
    } else {
      this.pauseBackgroundMusic()
    }
  }

  // Play sound effect only if enabled
  playSound(soundMethod) {
    if (this.soundEffectsEnabled) {
      soundMethod.call(this)
    }
  }
}

// Difficulty configurations - moved outside component to fix initialization error
const DIFFICULTY_CONFIGS = {
  easy: {
    name: "Easy Mode",
    lanes: 30,
    startingMultiplier: 1.01,
    maxMultiplier: 100,
    multipliers: [
      1.01, 1.03, 1.06, 1.10, 1.15, 1.20, 1.25, 1.30, 1.35, 1.40,
      1.45, 1.50, 1.55, 1.60, 1.65, 1.70, 1.75, 1.80, 1.85, 1.90,
      1.95, 2.00, 2.10, 2.20, 2.30, 2.40, 2.50, 2.60, 2.70, 2.80
    ]
  },
  medium: {
    name: "Medium Mode",
    lanes: 25,
    startingMultiplier: 1.08,
    maxMultiplier: 500,
    multipliers: [
      1.08, 1.12, 1.18, 1.25, 1.35, 1.45, 1.55, 1.65, 1.75, 1.85,
      1.95, 2.05, 2.15, 2.25, 2.35, 2.45, 2.55, 2.65, 2.75, 2.85,
      3.00, 3.20, 3.40, 3.60, 3.80
    ]
  },
  hard: {
    name: "Hard Mode",
    lanes: 22,
    startingMultiplier: 1.18,
    maxMultiplier: 1000,
    multipliers: [
      1.18, 1.25, 1.35, 1.45, 1.55, 1.65, 1.75, 1.85, 1.95, 2.05,
      2.15, 2.25, 2.35, 2.45, 2.55, 2.65, 2.75, 2.85, 3.00, 3.20,
      3.40, 3.60
    ]
  },
  extreme: {
    name: "Extreme Mode",
    lanes: 18,
    startingMultiplier: 1.44,
    maxMultiplier: 3608855,
    multipliers: [
      1.44, 1.55, 1.68, 1.82, 1.98, 2.15, 2.35, 2.58, 2.84, 3.15,
      3.50, 3.90, 4.35, 4.85, 5.40, 6.00, 6.70, 7.50
    ]
  }
}
 
function Chicken() {
  const [token, setToken] = useState(null)
  const [gameState, setGameState] = useState({
    balance: 0,
    betAmount: 0.5,
    difficulty: 0,
  })

  // Lane movement state
  const [currentLaneIndex, setCurrentLaneIndex] = useState(0)
  const [movedLanes, setMovedLanes] = useState([0]) // Track all lanes the chicken has moved through
  const [allLanes, setAllLanes] = useState(() => generateLanesForDifficulty(DIFFICULTY_CONFIGS, 'easy')) // Generate lanes based on difficulty
  
  // Jump physics state
  const [isJumping, setIsJumping] = useState(false)
  const [jumpProgress, setJumpProgress] = useState(0) // 0 to 1, progress through jump
  const [jumpStartLane, setJumpStartLane] = useState(0)
  const [jumpTargetLane, setJumpTargetLane] = useState(0)
  const [autoFinalJumped, setAutoFinalJumped] = useState(false)
  
  // Crash control state
  // Crash index removed - server handles all crash detection via WebSocket
  const [gameEnded, setGameEnded] = useState(false) // Track if game has ended due to crash
  const [isDead, setIsDead] = useState(false) // Track if chicken is dead (crashed)

  // Fixed lane width in pixels (central config)
  const LANE_WIDTH_PX = GAME_CONFIG.LANE_WIDTH_PX

  // Element ref for the game container to measure available width
  const gameContainerRef = useRef(null)

  // Compute how many lanes fit in the visible area based on fixed lane width
  const computeWindowSizeFromContainer = () => {
    const el = gameContainerRef.current
    if (!el) return 5
    const width = el.clientWidth || 0
    // Ensure at least 5 lanes, cap by total lanes if needed later
    return Math.max(5, Math.floor(width / LANE_WIDTH_PX))
  }

  const [windowSize, setWindowSize] = useState(5) // Number of lanes to show at once

  // Initialize WebSocket connection
  useEffect(() => {
    if (token) {
      socketGameAPI.connect(token);
    }

    return () => {
      socketGameAPI.disconnect();
    };
  }, [token]);
  const [stableRange, setStableRange] = useState({ start: 0, end: 4 }) // Stable range during jumps
 
  const [showHowToPlay, setShowHowToPlay] = useState(false)
  const [showDifficultyDropdown, setShowDifficultyDropdown] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [currentDifficulty, setCurrentDifficulty] = useState('easy') // Default to easy mode
  const [showSettings, setShowSettings] = useState(false) // Settings popup state
  const [soundEnabled, setSoundEnabled] = useState(true) // Enable sound effects by default
  const [musicEnabled, setMusicEnabled] = useState(true) // Default play audio enabled
  const [isRestarting, setIsRestarting] = useState(false) // Track if restart animation is playing
  const [betAmount, setBetAmount] = useState(4.00) // Bet amount state
  const [isInputFocused, setIsInputFocused] = useState(false) // Track if input is focused
  const [showCashOutAnimation, setShowCashOutAnimation] = useState(false) // Cash out animation state
  const [lastCashOutAmount, setLastCashOutAmount] = useState(0) // Track last cash out for animation
  const audioManager = useRef(null) // Reference for Howler.js audio manager

  // Server game state
  const [currentGameId, setCurrentGameId] = useState(null) // Active game ID from server
  const [isGameActive, setIsGameActive] = useState(false) // Whether a server game is active
  const [serverMultiplier, setServerMultiplier] = useState(null) // Current multiplier from server
  const [isCreatingGame, setIsCreatingGame] = useState(false) // Loading state for game creation
  const [gameError, setGameError] = useState(null) // Game-related errors
  const restartGuardRef = useRef(false) // prevent double scheduling of restart
  const [blockedNextLane, setBlockedNextLane] = useState(false) // Whether the immediate next lane is blocked per server
  const [isValidatingNext, setIsValidatingNext] = useState(false) // prevent overlapping move validations
  const [resetKey, setResetKey] = useState(0) // force re-mount Lane to reset cars/animations
  // Crash visualization signal (lane and nonce) to inject a one-shot car in the crash lane
  const [crashVisual, setCrashVisual] = useState({ lane: -1, tick: 0 })

  // Token handling and user info
  useEffect(() => {
    // Extract token from URL parameters
    const params = new URLSearchParams(window.location.search)
    const newToken = params.get("token")

    // Store token in localStorage
    if (newToken) {
      localStorage.setItem("chicknroad", newToken)
      setToken(newToken)
    } else {
      // Get token from localStorage if not in URL
      const storedToken = localStorage.getItem("chicknroad")
      if (storedToken) {
        setToken(storedToken)
      }
    }
  }, [])

  // Predictive blocker: ask server if the next lane is allowed; if not, show blocker there
  // Disable HTTP predictive blocker; rely on socket result timing
  useEffect(() => {
    setBlockedNextLane(false)
  }, [currentLaneIndex])

  const { userInfo, isLoading: userLoading, error: userError, refetch } = useGetUserInfo(token)
  // Realtime/optimistic balance display synced with server when refetch completes
  const [displayBalance, setDisplayBalance] = useState(0)

  // Update balance when user info changes
  useEffect(() => {
    if (userInfo?.balance !== undefined) {
      setGameState(prev => ({
        ...prev,
        balance: userInfo.balance
      }))
      // Sync display balance from latest server value
      setDisplayBalance(userInfo.balance)
    }
  }, [userInfo])


  // Physics-based jump function
  const startJump = (targetLane) => {
    if (isJumping) return // Prevent multiple jumps
    if (isDead || gameEnded) return // Prevent jumping when chicken is dead or game ended

    // Play jump audio when starting jump
    playJumpAudio()

    setIsJumping(true)
    setJumpStartLane(currentLaneIndex)
    setJumpTargetLane(targetLane)
    setJumpProgress(0)

    // Animate the jump
    const jumpDuration = GAME_CONFIG.JUMP?.DURATION_MS ?? 800 // ms jump duration from config
    const startTime = Date.now()

    const animateJump = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / jumpDuration, 1)

      // Apply physics-based easing with more realistic acceleration/deceleration
      // Use easeInOutCubic for more natural movement
      const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      const easedProgress = easeInOutCubic(progress)

      setJumpProgress(easedProgress)

      if (progress < 1) {
        requestAnimationFrame(animateJump)
      } else {
        // Jump completed
        completeJump(targetLane)
      }
    }

    requestAnimationFrame(animateJump)
  }

  // Complete the jump and update state
  const completeJump = (targetLane) => {
    // 1) Advance index first so range computations use the new lane
    setCurrentLaneIndex(targetLane)

    // 2) Update stableRange immediately to the new sliding window to avoid a frame where background resets
    const totalLanes = allLanes.length
    let start = Math.min(targetLane, Math.max(0, totalLanes - windowSize))
    let end = Math.min(totalLanes - 1, start + windowSize - 1)
    setStableRange(prev => (prev.start === start && prev.end === end) ? prev : { start, end })

    // 3) Now end the jump and reset progress
    setJumpProgress(0)
    setIsJumping(false)

    // Update moved lanes (guard duplicates and dev-only log)
    setMovedLanes(prev => {
      if (prev[prev.length - 1] === targetLane) return prev;
      const next = [...prev, targetLane];
      if (process.env.NODE_ENV !== 'production') {
        console.log('Chicken jumped through lanes:', next);
      }
      return next;
    })

    // If reached the last lane, log finished to console
    if (targetLane >= allLanes.length) {
      console.log('Finished: reached final side road')
    } else if (targetLane === allLanes.length - 1) {
      console.log('Finished: jumping into final lane before side road')
    }

    // No dynamic multiplier removal - using pre-generated lanes
  }

  // Auto-jump to final sidewalk when standing on the LAST multiplier value (e.g., 2.80)
  useEffect(() => {
    if (!Array.isArray(allLanes) || allLanes.length === 0) return
    if (!isGameActive) return
    if (isDead || gameEnded) return
    if (isJumping) return
    if (autoFinalJumped) return

    // Determine the currently displayed multiplier (UI index maps to array index - 1)
    const currentValue = currentLaneIndex > 0 ? allLanes[currentLaneIndex - 1] : null
    const lastValue = allLanes[allLanes.length - 1]

    // If currently on the last multiplier value, auto-jump to the final sidewalk (next UI index)
    if (currentValue != null && currentValue === lastValue) {
      console.log('Auto final jump to sidewalk from last multiplier value', currentValue)
      startJump(currentLaneIndex + 1)
      setAutoFinalJumped(true)
    }
  }, [currentLaneIndex, isJumping, isDead, gameEnded, allLanes, isGameActive, autoFinalJumped])

  // Function to move chicken to next lane with server validation
  const moveToNextLane = async () => {
    console.log('🎮 moveToNextLane called:', {
      isDead,
      gameEnded,
      isGameActive,
      currentGameId,
      currentLaneIndex,
      isValidatingNext
    });

    // Don't allow movement if chicken is dead or game has ended
    if (isDead || gameEnded) {
      console.log('Cannot move: chicken is dead or game has ended');
      return;
    }
    // Prevent overlapping validations/click spamming
    if (isValidatingNext || isJumping) {
      console.log('Already validating or jumping, ignoring GO');
      return;
    }

    // For first move in a new game, just start the jump animation
    if (!isGameActive || !currentGameId) {
      const nextPosition = currentLaneIndex + 1; // UI lane index to jump to (1..N). 0 is sidewalk.
      console.log(`Starting local jump to position ${nextPosition} (no server validation needed for first move)`);
      startJump(nextPosition);
      return;
    }

    // For subsequent moves, validate with server
    // Snapshot current index BEFORE updating state/animation
    const preIndex = currentLaneIndex;
    const nextPosition = preIndex + 1;
    // Allow final jump into the final sidewalk (index == allLanes.length) without server validation
    if (Array.isArray(allLanes) && nextPosition > allLanes.length - 1) {
      console.log('Final jump into final sidewalk');
      startJump(nextPosition);
      return;
    }
    const nextLaneNumber = nextPosition; // keep for logs (UI index)
    // Server expects the NEXT lane as 0-based index: equals current UI index (preIndex)
    const serverLaneIndex = preIndex;

    console.log(`Checking server: Can move to position ${nextPosition} (Lane ${nextLaneNumber})?`);

    // Validate first; only animate if server allows
    setIsValidatingNext(true);

    try {
      // Ensure socket connected, then validate with server via WebSocket (preferred)
      const moveData = await socketGameAPI.validateMove(currentGameId, serverLaneIndex, token);
      console.log('🔍 WebSocket move validation:', {
        clientPosition: nextPosition,
        serverLaneIndex: serverLaneIndex,
        canMove: moveData.canMove,
        gameId: currentGameId,
        moveData
      });

      const willCrash = typeof moveData.willCrash === 'boolean' ? moveData.willCrash : !moveData.canMove;
      if (willCrash) {
        // Animate the jump to the next lane, then crash after landing (not immediate)
        setBlockedNextLane(false) // ensure no blocker shows on the crash lane
        // Signal the lane component to inject a one-shot car in the crash lane for visual impact
        setCrashVisual({ lane: nextPosition, tick: Date.now() })
        startJump(nextPosition);
        const JUMP_DURATION_MS = GAME_CONFIG.JUMP?.DURATION_MS ?? 800;
        setTimeout(() => {
          handleCrash(moveData);
        }, JUMP_DURATION_MS);
      } else {
        // Safe to jump; add a short decision delay so it doesn't move instantly
        const DECISION_DELAY_MS = 150;
        setTimeout(() => {
          startJump(nextPosition);
        }, DECISION_DELAY_MS);
      }
    } catch (wsError) {
      console.error('WebSocket validation failed:', wsError);
    } finally {
      setIsValidatingNext(false);
    }
  }

  // Handle crash when server detects collision
  const handleCrash = (moveData) => {
    console.log('🔥 CRASH DETECTED by server!', moveData);

    // Stop all animations and movement
    setIsJumping(false);
    setJumpProgress(0);

    // Set death state
    setIsDead(true);
    setGameEnded(true);
    setIsGameActive(false);

    // Play crash audio
    playCrashAudio();

    // Clear game data
    setCurrentGameId(null);

    // Force auto-restart after crash regardless of AUTO setting
    if (!restartGuardRef.current) {
      restartGuardRef.current = true;
      const delay = (GAME_CONFIG.RESTART?.DELAY_MS ?? 1200);
      setTimeout(() => {
        resetGame();
        restartGuardRef.current = false;
      }, Math.max(0, delay));
    }
  };

  // Calculate visible range using a sliding window that advances with the chicken
  const calculateDynamicRange = () => {
    return stableRange
  }


  // Update stable range when not jumping using a sliding window
  useEffect(() => {
    if (!isJumping) {
      const totalLanes = allLanes.length
      // Slide window so it advances as the chicken moves forward
      let start = Math.min(currentLaneIndex, Math.max(0, totalLanes - windowSize))
      let end = Math.min(totalLanes - 1, start + windowSize - 1)

      setStableRange(prev => {
        if (prev.start === start && prev.end === end) return prev
        return { start, end }
      })
    }
  }, [currentLaneIndex, windowSize, isJumping, allLanes.length])

  // After first render, measure container and set initial windowSize
  useEffect(() => {
    const initial = computeWindowSizeFromContainer()
    setWindowSize(initial)
    setStableRange({ start: 0, end: Math.max(0, initial - 1) })
  }, [])

  // Responsively update the number of visible lanes when the container resizes
  useEffect(() => {
    let frame
    const handleResize = () => {
      // Use rAF to avoid excessive updates during continuous resize
      if (frame) cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const next = computeWindowSizeFromContainer()
        setWindowSize(prev => (prev === next ? prev : next))
      })
    }
    window.addEventListener('resize', handleResize)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // Get multipliers for display within the dynamic range
  const getVisibleLanes = () => {
    const range = calculateDynamicRange()
    return allLanes.slice(range.start, range.end + 1)
  }

  // Bet amount functions
  const incrementBet = () => {
    playButtonClickAudio();
    setBetAmount(prev => parseFloat((prev + 0.50).toFixed(2)))
  }

  const decrementBet = () => {
    playButtonClickAudio();
    setBetAmount(prev => Math.max(0.50, parseFloat((prev - 0.50).toFixed(2))))
  }

  // Press-and-hold repeat for bet controls
  const betHoldTimer = useRef(null)
  const betRepeat = useRef(null)
  const startHold = (fn) => {
    fn()
    if (betHoldTimer.current) clearTimeout(betHoldTimer.current)
    if (betRepeat.current) clearInterval(betRepeat.current)
    betHoldTimer.current = setTimeout(() => {
      betRepeat.current = setInterval(() => fn(), 100)
    }, 350) // delay before repeating
  }
  const endHold = () => {
    if (betHoldTimer.current) clearTimeout(betHoldTimer.current)
    if (betRepeat.current) clearInterval(betRepeat.current)
    betHoldTimer.current = null
    betRepeat.current = null
  }

  const handleBetInputChange = (e) => {
    const value = parseFloat(e.target.value)
    if (!isNaN(value) && value >= 0.50) {
      setBetAmount(parseFloat(value.toFixed(2)))
    }
  }

  // Initialize Howler.js audio manager
  useEffect(() => {
    console.log('Initializing Howler.js audio manager...')
    audioManager.current = new GameAudioManager()
    audioManager.current.setSoundEffectsEnabled(soundEnabled)

    // Start background music if enabled
    if (musicEnabled) {
      audioManager.current.setMusicEnabled(true)
    }

    return () => {
      // Cleanup audio on unmount
      if (audioManager.current) {
        audioManager.current.pauseBackgroundMusic()
      }
    }
  }, [])

  // Preload commonly used images to reduce stutter
  useEffect(() => {
    preloadImages([
      cap1Image,
      cap2Image,
      blockerImage,
      sideRoadImage,
      car1,
      car2,
      car3,
      car4,
      logoImage,
      winNotificationImage,
      deadChickenImage
    ])
  }, [])

  // Update audio settings when states change
  useEffect(() => {
    if (audioManager.current) {
      audioManager.current.setSoundEffectsEnabled(soundEnabled)
    }
  }, [soundEnabled])

  useEffect(() => {
    if (audioManager.current) {
      audioManager.current.setMusicEnabled(musicEnabled)
    }
  }, [musicEnabled])

  // Play cashout audio using Howler.js
  const playCashoutAudio = () => {
    console.log('Playing cashout audio with Howler.js...', { soundEnabled })
    if (audioManager.current && soundEnabled) {
      audioManager.current.playCashout()
    }
  }

  // Play crash audio using Howler.js  
  const playCrashAudio = () => {
    console.log('Playing crash audio with Howler.js...', { soundEnabled })
    if (audioManager.current && soundEnabled) {
      audioManager.current.playCrash()
    }
  }

  // Handler for DynamicCar blocked stop (unified audio)
  const handleCarBlockedStop = () => {
    playCrashAudio()
  }

  // Play button click audio
  const playButtonClickAudio = () => {
    console.log('Playing button click audio...', { soundEnabled })
    if (audioManager.current && soundEnabled) {
      audioManager.current.playButtonClick()
    }
  }

  // Play jump audio
  const playJumpAudio = () => {
    console.log('Playing jump audio...', { soundEnabled })
    if (audioManager.current && soundEnabled) {
      audioManager.current.playJump()
    }
  }

  // Cash out functionality with real backend API
  const handleCashOut = async () => {
    if (currentLaneIndex > 0 && !isDead && !gameEnded && isGameActive && currentGameId) {
      // Play button click audio
      playButtonClickAudio();

      try {
        console.log(`Attempting to cash out at lane ${currentLaneIndex}`);

        // Call backend cash out via WebSocket only (no HTTP fallback)
        const cashOutData = await socketGameAPI.cashOut(currentGameId, currentLaneIndex, token);
        console.log('WebSocket cash out successful:', cashOutData);
        console.log('Cash out successful:', cashOutData);

        // Play cashout audio
        playCashoutAudio();

        // Store cash out amount for animation
        setLastCashOutAmount(cashOutData.winAmount);

        // Show cash out animation
        setShowCashOutAnimation(true);

        // Hide animation after 3 seconds
        setTimeout(() => {
          setShowCashOutAnimation(false);
        }, 3000);

        // Reset game state
        setIsGameActive(false);
        setCurrentGameId(null);
        setServerMultiplier(null);

        // Optimistically add winnings to displayed balance; refetch will confirm
        if (typeof cashOutData?.winAmount === 'number' && typeof userInfo?.balance === 'number') {
          setDisplayBalance(prev => (userInfo.balance + cashOutData.winAmount))
        }

        // Reset game after cash out
        setTimeout(() => {
          resetGame();
        }, 1500);

        console.log(`Cashed out: ${cashOutData.winAmount} ETB at ${cashOutData.multiplier}x multiplier`);

        // Refresh user info to get updated balance without full page reload
        try {
          await refetch();
        } catch (e) {
          console.warn('User info refresh failed after cash out; continuing without reload.', e);
      }

    } catch (error) {
        console.error('Cash out failed:', error);
        setGameError(error.message || 'Failed to cash out');

        // On error, reset game state
        setIsGameActive(false);
        setCurrentGameId(null);
        setServerMultiplier(null);
      }
    }
  }

  // Change difficulty and regenerate lanes
  const changeDifficulty = (newDifficulty) => {
    // Play button click audio
    playButtonClickAudio();

    setCurrentDifficulty(newDifficulty)
    const newLanes = generateLanesForDifficulty(DIFFICULTY_CONFIGS, newDifficulty)
    setAllLanes(newLanes)
    // Reset game when difficulty changes
    resetGame()
    console.log(`Difficulty changed to ${newDifficulty}, ${newLanes.length} lanes generated`)
  }

  // Reset game function
  const resetGame = () => {
    console.log('Resetting game - chicken back to side road')
    setCurrentLaneIndex(0) // Back to side road (index 0)
    setMovedLanes([0])
    setGameEnded(false)
    setIsDead(false) // Reset dead state when game is reset
    setIsJumping(false) // Reset jump state
    setJumpProgress(0)
    setIsRestarting(false) // Reset restart animation
    setAutoFinalJumped(false)
    setIsGameActive(false)
    setIsRestarting(true)
    setStableRange({ start: 0, end: 4 }) // Reset stable range
    setBlockedNextLane(false) // clear blocker
    setCrashVisual({ lane: -1, tick: 0 }) // clear any crash lane visuals
    setResetKey(prev => prev + 1) // force Lane re-mount to reset cars

    // Clear server game state
    setCurrentGameId(null)
    setIsGameActive(false)
    setServerMultiplier(null)
    setGameError(null)

    // Reset global traffic engine to remove any leftover cars/state
    try {
      trafficEngine.stop()
      trafficEngine.reset()
      // Re-init with current lane count and sprites so it restarts cleanly
      trafficEngine.init({ laneCount: allLanes.length, cfg: GAME_CONFIG, carSprites: [car1, car2, car3, car4] })
      trafficEngine.start()
    } catch (e) {
      console.warn('Traffic engine reset encountered an issue:', e)
    }

    // Crash index removed: server determines crashes via WebSocket/HTTP responses.
    console.log('Game reset complete - waiting for server to determine crashes')
  }

  // Start new game with real backend API
  const startNewGame = async () => {
    // Play button click audio
    playButtonClickAudio();

    // Check if user info is available
    if (!userInfo || !token) {
      setGameError('Please login to play');
      return;
    }

    // Check if player has enough balance
    if (userInfo.balance < betAmount) {
      setGameError(`Insufficient balance. You need ${betAmount.toFixed(2)} ETB to play`);
      return;
    }

    try {
      setIsCreatingGame(true);
      setGameError(null);

      // Close any open dropdowns
      setShowDifficultyDropdown(false);

      console.log(`Creating new game - Bet: ${betAmount.toFixed(2)} ETB, Difficulty: ${currentDifficulty}`);

      // Create game via backend API
      const gameData = await gameApi.createGame({
        clientSeed: gameApi.generateClientSeed(),
        difficulty: currentDifficulty,
        betAmount: betAmount,
        creatorChatId: userInfo.chatId
      }, token);

      console.log('Game created successfully:', gameData);

      // Set server game state
      setCurrentGameId(gameData.gameId);
      setIsGameActive(true);
      setAutoFinalJumped(false);
      setServerMultiplier(gameData.multiplier);

      // Optimistically reflect the debit locally; server will confirm on next refetch
      if (typeof userInfo?.balance === 'number') {
        setDisplayBalance(prev => Math.max(0, (userInfo.balance - betAmount)))
      }

      // Join WebSocket room for this game
      socketGameAPI.joinGame(gameData.gameId);

      // Start the game by moving to first lane
      // If backend says first lane (server 0) will crash, still animate jump then crash
      if (gameData?.canMoveFirstMove === false || gameData?.isCrashOnFirstLane === true) {
        // Animate to lane 1
        // Ensure no blocker shows on the crash lane and inject a crash car for the visual
        const nextPosition = currentLaneIndex + 1
        setBlockedNextLane(false)
        setCrashVisual({ lane: nextPosition, tick: Date.now() })
        startJump(nextPosition);
        // After animation, handle crash
        setTimeout(() => {
          handleCrash({ reason: 'first_move_crash', currentLane: 0 });
        }, 800);
      } else {
        moveToNextLane();
      }

    } catch (error) {
      console.error('Failed to create game:', error);
      setGameError(error.message || 'Failed to create game');
    } finally {
      setIsCreatingGame(false);
    }
  }

  // Auto-restart when chicken dies is handled inline in moveToNextLane crash branch.
  // Also add a guarded effect in case other code paths set isDead/gameEnded.
  useEffect(() => {
    if (!GAME_CONFIG.RESTART?.AUTO) return
    if (restartGuardRef.current) return
    if (isDead && gameEnded) {
      restartGuardRef.current = true
      const delay = GAME_CONFIG.RESTART?.DELAY_MS ?? 1200
      if (delay <= 0) {
        resetGame()
        restartGuardRef.current = false
        return
      }
      const t = setTimeout(() => {
        resetGame()
        restartGuardRef.current = false
      }, delay)
      return () => clearTimeout(t)
    }
  }, [isDead, gameEnded])

  // Fallback watchdog: if skull (💀) stays visible too long, force reset
  useEffect(() => {
    if (!(isDead || gameEnded)) return
    const watchdog = setTimeout(() => {
      if (isDead || gameEnded) {
        resetGame()
        restartGuardRef.current = false
      }
    }, Math.max(2000, (GAME_CONFIG.RESTART?.DELAY_MS ?? 1200) + 500))
    return () => clearTimeout(watchdog)
  }, [isDead, gameEnded])

  // Close difficulty dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDifficultyDropdown && !event.target.closest('.difficulty-selector')) {
        setShowDifficultyDropdown(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showDifficultyDropdown])



  return (
    <div className="flex min-h-screen flex-col bg-gray-950 text-white overflow-hidden" style={{ backgroundColor: '#1A1A1A' }}>
      {/* CSS to hide number input arrows */}
      <style>{`
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>
      {/* Mobile-First Game Header */}
      <header className="bg-black px-1 py-2 flex items-center justify-between border-b border-gray-900">
        <div className="flex items-center gap-2">
          <img
            src={logoImage}
            alt="Chicken Road Logo"
            className="w-40 sm:h-8"
          />
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 sm:gap-2" style={{ backgroundColor: '#2A2A2A' }}>
            <FaCoins className="text-yellow-400 text-sm" />
            {userInfo ? (
              <>
                <span className="text-sm sm:text-md font-bold">
                  {userInfo.balance?.toFixed(2) || '0.00'}
                </span>
                <span className="text-xs text-gray-300">ETB</span>
              </>
            ) : (
              <>
                <div className="w-16 h-4 bg-gray-600 rounded animate-pulse"></div>
                <span className="text-xs text-gray-300">ETB</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Full-Screen Game Container */}
      <div ref={gameContainerRef} className="grow relative  w-full h-[58%] bg-gray-700 overflow-hidden">
        <TrafficProvider laneCount={allLanes.length} carSprites={[car1, car2, car3, car4]}>
              <Lane
            key={resetKey}
            remainingMultipliers={allLanes} // render all multipliers
            currentIndex={currentLaneIndex} // relative index equals global since start=0
            displayIndex={currentLaneIndex}
                globalCurrentIndex={currentLaneIndex}
            globalDisplayStart={0}
            allLanes={allLanes}
            isDead={isDead}
                gameEnded={gameEnded}
                isJumping={isJumping}
                jumpProgress={jumpProgress}
                jumpStartLane={jumpStartLane}
                jumpTargetLane={jumpTargetLane}
            isRestarting={isRestarting}
            blockedNextLane={blockedNextLane}
            onCarBlockedStop={handleCarBlockedStop}
            crashVisualLane={crashVisual.lane}
            crashVisualTick={crashVisual.tick}
          />
        </TrafficProvider>

        {/* Game Error Overlay */}
        {gameError && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
            <div className="bg-red-600 rounded-xl p-6 text-center shadow-2xl max-w-sm">
              <div className="text-2xl font-bold mb-2">⚠️ Error</div>
              <div className="text-sm opacity-90 mb-4">{gameError}</div>
              <button
                onClick={() => setGameError(null)}
                className="px-4 py-2 bg-white text-red-600 rounded-lg text-sm font-medium hover:bg-gray-100"
              >
                OK
              </button>
            </div>
          </div>
          )}

        {/* Cash Out Success Animation with Win Notification Image */}
        {showCashOutAnimation && (
          <div className="absolute z-30" style={{ top: '20%', left: '50%', transform: 'translate(-50%, -50%)' }}>
            <div className="relative">
              <img src={winNotificationImage} alt="Win Notification" className="w-96 h-40" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <div className=" text-black font-black text-lg px-6  ">WIN!</div>
                <div className="text-white  font-bold text-2xl drop-shadow-lg mt-7">{lastCashOutAmount.toFixed(2)} ETB</div>
              </div>
              </div>
            </div>
          )}
      </div>


      {/* Bottom Controller UI - Exact Match Design */}
      {/* Enhanced Controller UI */}
      <div className="p-2 sm:p-4">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-2xl shadow-2xl p-3 sm:p-4 lg:p-6" style={{ backgroundColor: '#444444' }}>
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 sm:gap-4 lg:gap-6">

              {/* Left Section: Bet Controls */}
            <div className="flex items-center gap-4">
              {/* Bet Amount Control */}
                <div className="flex items-center rounded-xl" style={{ backgroundColor: '#2A2A2A' }}>
                  <button
                    onMouseDown={() => startHold(decrementBet)}
                    onTouchStart={() => startHold(decrementBet)}
                    onMouseUp={endHold}
                    onMouseLeave={endHold}
                    onTouchEnd={endHold}
                    onClick={decrementBet}
                    disabled={currentLaneIndex > 0}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-xl font-bold transition-all ${currentLaneIndex > 0
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-gray-700 active:scale-95'
                      }`}
                  >
                    −
                  </button>
                  <div className="flex-1 text-center px-4">
                    <input
                      type="number"
                      step="0.50"
                      min="0.50"
                      value={betAmount.toFixed(2)}
                      onChange={handleBetInputChange}
                      onFocus={() => setIsInputFocused(true)}
                      onBlur={() => setIsInputFocused(false)}
                      disabled={currentLaneIndex > 0}
                      className={`text-white font-bold text-lg text-center w-full bg-transparent border-none outline-none ${currentLaneIndex > 0
                        ? 'opacity-50 cursor-not-allowed'
                        : isInputFocused ? 'bg-gray-700 rounded px-2 py-1' : ''
                        }`}
                      style={{
                        appearance: 'none',
                        MozAppearance: 'textfield',
                        WebkitAppearance: 'none'
                      }}
                    />
              </div>
                  <button
                    onMouseDown={() => startHold(incrementBet)}
                    onTouchStart={() => startHold(incrementBet)}
                    onMouseUp={endHold}
                    onMouseLeave={endHold}
                    onTouchEnd={endHold}
                    onClick={incrementBet}
                    disabled={currentLaneIndex > 0}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-xl font-bold transition-all ${currentLaneIndex > 0
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-gray-700 active:scale-95'
                      }`}
                  >
                    +
                  </button>
            </div>

                {/* Settings Button */}
                <button
                  onClick={() => {
                    playButtonClickAudio();
                    setShowSettings(true);
                  }}
                  className="px-4 py-3 rounded-xl flex items-center justify-center text-white transition-all" style={{ backgroundColor: '#2A2A2A' }}>
                  <FaCog className="text-lg" />
                </button>
            </div>

              {/* Center Section: Difficulty Selector */}
              <div className={`flex-1 transition-opacity duration-300 difficulty-selector relative ${currentLaneIndex > 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                {/* Mobile: Dropdown */}
                <div className="lg:hidden">
              <button
                    onClick={() => {
                      if (currentLaneIndex === 0) {
                        playButtonClickAudio();
                        setShowDifficultyDropdown(!showDifficultyDropdown);
                      }
                    }}
                    disabled={currentLaneIndex > 0}
                    className={`w-full flex items-center justify-between rounded-xl px-4 py-3 text-left ${currentLaneIndex > 0 ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-800'}`} style={{ backgroundColor: '#2A2A2A' }}>
                    <span className="text-white font-medium text-lg">{DIFFICULTY_CONFIGS[currentDifficulty].name}</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white" className={`transform transition-transform ${showDifficultyDropdown && currentLaneIndex === 0 ? 'rotate-180' : ''}`}>
                      <path d="M7 10l5 5 5-5z" />
                    </svg>
              </button>

                  {showDifficultyDropdown && currentLaneIndex === 0 && (
                    <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl overflow-hidden z-50  shadow-2xl" style={{ backgroundColor: '#2A2A2A' }}>
                      {Object.entries(DIFFICULTY_CONFIGS).map(([key, config]) => (
                  <button
                          key={key}
                          onClick={() => {
                            changeDifficulty(key)
                            setShowDifficultyDropdown(false)
                          }}
                          className={`w-full p-4 text-left  transition-colors ${currentDifficulty === key ? 'bg-gray-800' : ''}`}
                        >
                          <div className="text-white font-medium text-lg">{config.name}</div>
                  </button>
                      ))}
                    </div>
                  )}
              </div>

                {/* Desktop: Inline Pills */}
                <div className="hidden lg:flex items-center justify-center gap-2">
                  {Object.entries(DIFFICULTY_CONFIGS).map(([key, config]) => (
                  <button
                      key={key}
                      onClick={() => changeDifficulty(key)}
                      disabled={currentLaneIndex > 0}
                      className={`px-6 py-3 rounded-xl transition-all whitespace-nowrap font-medium text-base ${currentDifficulty === key
                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/25'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                        } ${currentLaneIndex > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {config.name}
                  </button>
                  ))}
              </div>
            </div>

              {/* Right Section: Game Control Buttons */}
              <div className="flex items-center gap-4">
                {currentLaneIndex === 0 && !isJumping ? (
                  /* Initial Play Button - Before Game Starts */
                <button
                    onClick={startNewGame}
                    disabled={!userInfo || (userInfo.balance < betAmount) || isCreatingGame}
                    className={`w-full lg:w-48 h-16 lg:h-16 font-bold px-8 rounded-xl text-xl transition-all duration-200 ${!userInfo || (userInfo.balance < betAmount) || isCreatingGame
                      ? 'opacity-50 cursor-not-allowed bg-gray-700'
                      : 'hover:opacity-90 active:scale-95 bg-green-500 text-white shadow-lg shadow-green-500/25'
                      }`}
                  >
                    {isCreatingGame ? 'Creating...' :
                      !userInfo ? 'Loading...' :
                        (userInfo.balance < betAmount) ? 'Insufficient Balance' : 'Play'}
                </button>
                ) : (
                  /* Dual Button Layout - During Game */
                  <div className="grid grid-cols-2 gap-3 w-full">
                    {/* Cash Out Button */}
              <button 
                      onClick={handleCashOut}
                      className="w-full h-16 font-bold rounded-xl text-lg transition-all duration-200 hover:opacity-90 active:scale-95 bg-yellow-400 text-black shadow-lg shadow-yellow-400/25"
                    >
                      <div className="text-center">
                        <div className="text-base opacity-90">CASH OUT</div>
                        <div className="text-xl font-extrabold">
                          {(betAmount * (allLanes[currentLaneIndex - 1] || 1)).toFixed(2)} ETB
              </div>
            </div>
                    </button>

                    {/* GO Button */}
              <button
                      onClick={moveToNextLane}
                      disabled={currentLaneIndex >= allLanes.length || isJumping || isDead || gameEnded}
                      className={`w-full h-16 font-bold rounded-xl text-2xl transition-all duration-200 ${currentLaneIndex >= allLanes.length || isJumping || isDead || gameEnded
                        ? 'opacity-50 cursor-not-allowed bg-gray-700'
                        : 'hover:opacity-90 active:scale-95 bg-green-500 text-white shadow-lg shadow-green-500/25'
                        }`}
                    >
                      {isDead || gameEnded ? '💀' : currentLaneIndex >= allLanes.length ? 'MAX' : 'GO'}
              </button>
            </div>
          )}
              </div>
            </div>
          </div>
        </div>
      </div>






      {/* Settings Popup Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="w-full max-w-lg mx-4 rounded-2xl shadow-2xl" style={{ backgroundColor: '#2A2A2A' }}>
            {/* Profile header */}
            <div className="px-8 pt-8 pb-6 text-center">
              <div className="mx-auto w-20 h-20 rounded-full overflow-hidden ring-2 ring-gray-600 mb-4">
                <img src={`https://i.pravatar.cc/160?u=${userInfo?.username || 'player'}`} alt="avatar" className="w-full h-full object-cover" />
              </div>
              <div className="text-2xl font-semibold text-white">{userInfo?.username || 'Player'}</div>
            </div>

            <div className="border-t border-gray-700" />

            {/* Settings list */}
            <div className="px-6 py-4 space-y-4">
              {/* Music Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-700 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: musicEnabled ? '#3DC55B' : '#545454' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
                  </div>
                  <div>
                    <span className="text-white font-medium block">Music</span>
                    <span className="text-gray-400 text-sm">{musicEnabled ? 'Playing' : 'Paused'}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMusicEnabled(!musicEnabled)
                    if (!musicEnabled && audioManager.current) {
                      audioManager.current.play().catch(e => console.log('Music play failed:', e))
                    } else if (musicEnabled && audioManager.current) {
                      audioManager.current.pause()
                    }
                  }}
                  className={`w-16 h-8 rounded-full transition-all duration-300 relative shadow-inner ${musicEnabled ? 'shadow-green-600' : 'shadow-gray-700'}`}
                  style={{ backgroundColor: musicEnabled ? '#3DC55B' : '#545454' }}
                >
                  <div className={`w-7 h-7 bg-white rounded-full transition-all duration-300 absolute top-0.5 shadow-lg ${musicEnabled ? 'translate-x-8' : 'translate-x-0.5'}`}></div>
                </button>
              </div>

              {/* Sound Effects Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-700 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: soundEnabled ? '#3DC55B' : '#545454' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M3 9v6h4l5 5V4L7 9H3z" /></svg>
                  </div>
                  <div>
                    <span className="text-white font-medium block">Sound Effects</span>
                    <span className="text-gray-400 text-sm">{soundEnabled ? 'Enabled' : 'Disabled'}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`w-16 h-8 rounded-full transition-all duration-300 relative shadow-inner ${soundEnabled ? 'shadow-green-600' : 'shadow-gray-700'}`}
                  style={{ backgroundColor: soundEnabled ? '#3DC55B' : '#545454' }}
                >
                  <div className={`w-7 h-7 bg-white rounded-full transition-all duration-300 absolute top-0.5 shadow-lg ${soundEnabled ? 'translate-x-8' : 'translate-x-0.5'}`}></div>
                </button>
              </div>

              <div className="border-t border-gray-700" />

              {/* Game rules (placeholder) */}
              <button className="w-full flex items-center justify-between text-left hover:bg-gray-700 p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex items-center justify-center">📄</div>
                  <span className="text-white font-medium">Game rules</span>
                </div>
                <span className="text-gray-400">›</span>
              </button>

              {/* How to Play */}
              <button 
                onClick={() => {
                  setShowHowToPlay(true)
                  setShowSettings(false)
                }}
                className="w-full flex items-center gap-3 text-left hover:bg-gray-700 p-3 rounded-lg"
              >
                <div className="w-8 h-8 flex items-center justify-center"><span className="text-lg">ℹ️</span></div>
                <span className="text-white font-medium">How to Play</span>
              </button>
            </div>

            <div className="px-6 pb-6 pt-2 flex justify-end">
              <button onClick={() => setShowSettings(false)} className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Menu Overlay */}
      {showMenu && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-end sm:items-center justify-center z-50">
          <div className="bg-gray-800 rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-sm sm:mx-4 max-h-[80vh] overflow-y-auto">
            {/* User Profile Section */}
            <div className="flex items-center gap-3 mb-6">
              {userInfo ? (
                <>
                  <div className="flex-1">
                    <div className="text-white font-medium">@{userInfo.username}</div>
                    <div className="text-gray-400 text-sm flex items-center gap-1">
                      <FaCoins className="text-[#A78BFA] text-xs" />
                      {userInfo.balance?.toFixed(2) || '0.00'} ETB
                    </div>
                  </div>
                </>
              ) : (
                <div className="animate-pulse flex items-center gap-3 w-full">
                  <div className="w-12 h-12 rounded-full bg-gray-600"></div>
                  <div className="flex-1">
                    <div className="h-4 w-24 bg-gray-600 rounded mb-2"></div>
                    <div className="h-3 w-16 bg-gray-600 rounded"></div>
                  </div>
                </div>
              )}
            </div>

            {/* Audio Settings Section */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 flex items-center justify-center">
                    <span className="text-lg">🔊</span>
                  </div>
                  <span className="text-white">Sound</span>
                </div>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`w-12 h-6 rounded-full transition-colors ${soundEnabled ? 'bg-green-500' : 'bg-gray-600'
                    }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${soundEnabled ? 'translate-x-6' : 'translate-x-0.5'
                    }`}></div>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 flex items-center justify-center">
                    <span className="text-lg">🎵</span>
                  </div>
                  <span className="text-white">Music</span>
                </div>
                <button
                  onClick={() => {
                    setMusicEnabled(!musicEnabled)
                    // Toggle music immediately
                    if (!musicEnabled && audioRef.current) {
                      audioRef.current.play().catch(e => console.log('Music play failed:', e))
                    } else if (musicEnabled && audioRef.current) {
                      audioRef.current.pause()
                    }
                  }}
                  className={`w-12 h-6 rounded-full transition-colors ${musicEnabled ? 'bg-green-500' : 'bg-gray-600'
                    }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${musicEnabled ? 'translate-x-6' : 'translate-x-0.5'
                    }`}></div>
                </button>
              </div>
            </div>

            {/* Game Information Section */}
            <div className="space-y-3 mb-6">
              <button className="w-full flex items-center gap-3 text-left hover:bg-gray-700 p-2 rounded">
                <div className="w-6 h-6 flex items-center justify-center">
                  <span className="text-lg">🛡️</span>
                </div>
                <span className="text-white">Provably fair settings</span>
              </button>

              <button className="w-full flex items-center gap-3 text-left hover:bg-gray-700 p-2 rounded">
                <div className="w-6 h-6 flex items-center justify-center">
                  <span className="text-lg">📄</span>
                </div>
                <span className="text-white">Game rules</span>
              </button>

              <button className="w-full flex items-center gap-3 text-left hover:bg-gray-700 p-2 rounded">
                <div className="w-6 h-6 flex items-center justify-center">
                  <span className="text-lg">🕐</span>
                </div>
                <span className="text-white">My bet history</span>
              </button>

              <button
                onClick={() => {
                  setShowHowToPlay(true)
                  setShowMenu(false)
                }}
                className="w-full flex items-center gap-3 text-left hover:bg-gray-700 p-2 rounded"
              >
                <div className="w-6 h-6 flex items-center justify-center">
                  <span className="text-lg">ℹ️</span>
                </div>
                <span className="text-white">How to play?</span>
              </button>

              <Link
                to="/preview"
                className="w-full flex items-center gap-3 text-left hover:bg-gray-700 p-2 rounded"
                onClick={() => setShowMenu(false)}
              >
                <div className="w-6 h-6 flex items-center justify-center">
                  <span className="text-lg">🐔</span>
                </div>
                <span className="text-white">Chicken Animation Preview</span>
              </Link>
            </div>

            {/* Footer */}
            <div className="text-center">
              <div className="text-gray-400 text-sm mb-2">Powered by</div>
              <div className="flex items-center justify-center gap-1">
                <span className="text-yellow-400 font-bold text-lg">IN</span>
                <span className="text-white font-bold text-lg">OUT</span>
                <span className="text-yellow-400 text-lg">→</span>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={() => setShowMenu(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* How to Play Modal */}
      {showHowToPlay && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 max-w-md rounded-lg">
            <h3 className="text-xl font-bold mb-4">How to Play</h3>
            <div className="space-y-2 text-sm text-gray-300">
              <p>1. Set your bet amount and difficulty level</p>
              <p>2. Click "Play" to start the round</p>
              <p>3. The chicken will automatically move across multiplier zones</p>
              <p>4. Cash out before the chicken gets shot down to win</p>
              <p>5. Higher difficulty = higher risk but better multipliers</p>
            </div>
            <button
              onClick={() => setShowHowToPlay(false)}
              className="mt-4 w-full bg-green-600 hover:bg-green-700 py-2 rounded-lg font-medium"
            >
              Got it!
            </button>
          </div>
        </div>
      )}

        </div>
  )
}

export default Chicken