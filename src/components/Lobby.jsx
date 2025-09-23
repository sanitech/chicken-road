import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useGetUserInfo } from '../utils/getUserinfo'
import gameApi from '../utils/gameApi'
import socketGameAPI from '../utils/socketApi'
import { useAudioManager } from '../hooks/useAudioManager'
import { useGameState } from '../hooks/useGameState'
import { useGameLogic } from '../hooks/useGameLogic'
import { FaCoins, FaCog } from 'react-icons/fa'
import Switch from 'react-switch'
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
import car5 from '../assets/car5.png'
import car6 from '../assets/car6.png'
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

  // Use custom hooks for game state and logic
  const gameStateHook = useGameState()
  const {
    currentLaneIndex,
    movedLanes,
    allLanes,
    isJumping,
    jumpProgress,
    jumpStartLane,
    jumpTargetLane,
    autoFinalJumped,
    gameEnded,
    isDead,
    isGameActive,
    isRestarting,
    currentGameId,
    serverMultiplier,
    blockedNextLane,
    isValidatingNext,
    crashVisual,
    resetKey,
    showCashOutAnimation,
    lastCashOutAmount,
    setCurrentLaneIndex,
    setMovedLanes,
    setAllLanes,
    setIsJumping,
    setJumpProgress,
    setJumpStartLane,
    setJumpTargetLane,
    setAutoFinalJumped,
    setGameEnded,
    setIsDead,
    setIsGameActive,
    setIsRestarting,
    setCurrentGameId,
    setServerMultiplier,
    setBlockedNextLane,
    setIsValidatingNext,
    setCrashVisual,
    setResetKey,
    setShowCashOutAnimation,
    setLastCashOutAmount,
    resetGameState
  } = gameStateHook

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
  const [stableRange, setStableRange] = useState({ start: 0, end: 4 }) // Stable range during jumps
 
  // UI state
  const [showHowToPlay, setShowHowToPlay] = useState(false)
  const [showDifficultyDropdown, setShowDifficultyDropdown] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [currentDifficulty, setCurrentDifficulty] = useState('easy') // Default to easy mode
  const [showSettings, setShowSettings] = useState(false) // Settings popup state
  const [soundEnabled, setSoundEnabled] = useState(true) // Enable sound effects by default
  const [musicEnabled, setMusicEnabled] = useState(true) // Default play audio enabled
  const [betAmount, setBetAmount] = useState(4.00) // Bet amount state
  const [isInputFocused, setIsInputFocused] = useState(false) // Track if input is focused

  // Game creation state
  const [isCreatingGame, setIsCreatingGame] = useState(false) // Loading state for game creation
  const [gameError, setGameError] = useState(null) // Game-related errors
  const restartGuardRef = useRef(false) // prevent double scheduling of restart

  // Initialize WebSocket connection
  useEffect(() => {
    if (token) {
      socketGameAPI.connect(token);
    }

    return () => {
      socketGameAPI.disconnect();
    };
  }, [token]);

  // Initialize audio manager and game logic hooks
  const audioManager = useAudioManager(soundEnabled, musicEnabled)
  const gameLogic = useGameLogic(gameStateHook, audioManager.audioManager)

  // Initialize lanes based on difficulty
  useEffect(() => {
    const newLanes = generateLanesForDifficulty(DIFFICULTY_CONFIGS, currentDifficulty)
    setAllLanes(newLanes)
  }, [currentDifficulty, setAllLanes])

  // Traffic is managed by TrafficProvider; no direct init here to avoid double-control

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


  // Use game logic hook functions
  const { startJump, completeJump, handleCrash, moveToNextLane, handleCashOut, resetGame } = gameLogic

  // Enhanced completeJump that also updates stableRange
  const completeJumpWithRange = (targetLane) => {
    // Call the hook's completeJump
    completeJump(targetLane)
    
    // Update stableRange immediately to the new sliding window
    const totalLanes = allLanes.length
    let start = Math.min(targetLane, Math.max(0, totalLanes - windowSize))
    let end = Math.min(totalLanes - 1, start + windowSize - 1)
    setStableRange(prev => (prev.start === start && prev.end === end) ? prev : { start, end })
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
  // Wrapper function to call game logic hook with token
  const moveToNextLaneWithToken = async () => {
    const tok = token || localStorage.getItem('chicknroad')
    if (!tok) {
      setGameError('Please login to play (missing token)')
      return
    }
    await moveToNextLane(tok)
  }

  // Enhanced handleCrash that also manages restart guard
  const handleCrashWithRestart = (moveData) => {
    // Call the hook's handleCrash
    handleCrash(moveData)
    
    // Force auto-restart after crash regardless of AUTO setting
    if (!restartGuardRef.current) {
      restartGuardRef.current = true;
      const delay = (GAME_CONFIG.RESTART?.DELAY_MS ?? 1200);
      setTimeout(() => {
        resetGameWithCleanup();
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
    audioManager.playButtonClickAudio();
    setBetAmount(prev => parseFloat((prev + 0.50).toFixed(2)))
  }

  const decrementBet = () => {
    audioManager.playButtonClickAudio();
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
      car5,
      car6,
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
    audioManager.playCrashAudio()
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
  // Wrapper function to call game logic hook with token
  const handleCashOutWithToken = async () => {
    const tok = token || localStorage.getItem('chicknroad')
    if (!tok) {
      setGameError('Please login to cash out (missing token)')
      return
    }
    try {
      const cashOutData = await handleCashOut(tok)
      if (cashOutData) {
        // Optimistically add winnings to displayed balance; refetch will confirm
        if (typeof cashOutData?.winAmount === 'number' && typeof userInfo?.balance === 'number') {
          setDisplayBalance(prev => (userInfo.balance + cashOutData.winAmount))
        }

        // Refresh user info to get updated balance without full page reload
        try {
          await refetch();
        } catch (e) {
          console.warn('User info refresh failed after cash out; continuing without reload.', e);
        }
      }
    } catch (error) {
      console.error('Cash out failed:', error);
      setGameError(error.message || 'Failed to cash out');
    }
  }

  // Change difficulty and regenerate lanes
  const changeDifficulty = (newDifficulty) => {
    // Play button click audio
    audioManager.playButtonClickAudio();

    setCurrentDifficulty(newDifficulty)
    const newLanes = generateLanesForDifficulty(DIFFICULTY_CONFIGS, newDifficulty)
    setAllLanes(newLanes)
    // Reset game when difficulty changes
    resetGameWithCleanup()
    console.log(`Difficulty changed to ${newDifficulty}, ${newLanes.length} lanes generated`)
  }

  // Reset game function
  // Enhanced resetGame that includes additional cleanup
  const resetGameWithCleanup = () => {
    // Call the core reset (state only)
    resetGame()

    // Minimal UI cleanup
    setStableRange({ start: 0, end: 4 })
    setGameError(null)
  }

  // Start new game with real backend API
  const startNewGame = async () => {
    // Play button click audio
    audioManager.playButtonClickAudio();

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
        resetGameWithCleanup()
        restartGuardRef.current = false
        return
      }
      const t = setTimeout(() => {
        resetGameWithCleanup()
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
        resetGameWithCleanup()
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
        <div className="flex min-h-screen flex-col text-white overflow-hidden" style={{ backgroundColor: GAME_CONFIG.COLORS.BACKGROUND }}>
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
        <header className="px-1 py-2 flex items-center justify-between border-b" style={{ backgroundColor: GAME_CONFIG.COLORS.BACKGROUND, borderColor: GAME_CONFIG.COLORS.TERTIARY_TEXT }}>
        <div className="flex items-center gap-2">
          <img
            src={logoImage}
            alt="Chicken Road Logo"
            className="w-40 sm:h-8"
          />
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 sm:gap-2" style={{ backgroundColor: GAME_CONFIG.COLORS.ELEVATED }}>
            <FaCoins className="text-sm" style={{ color: GAME_CONFIG.COLORS.CASHOUT_BUTTON }} />
            {userInfo ? (
              <>
                <span className="text-sm sm:text-md font-bold" style={{ color: GAME_CONFIG.COLORS.BRIGHT_TEXT }}>
                  {userInfo.balance?.toFixed(2) || '0.00'}
                </span>
                <span className="text-xs" style={{ color: GAME_CONFIG.COLORS.SECONDARY_TEXT }}>ETB</span>
              </>
            ) : (
              <>
                <div className="w-16 h-4 rounded animate-pulse" style={{ backgroundColor: GAME_CONFIG.COLORS.TERTIARY_TEXT }}></div>
                <span className="text-xs" style={{ color: GAME_CONFIG.COLORS.SECONDARY_TEXT }}>ETB</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Full-Screen Game Container */}
        <div ref={gameContainerRef} className="grow relative  w-full h-[58%] overflow-hidden" style={{ backgroundColor: GAME_CONFIG.COLORS.ELEVATED }}>
        <TrafficProvider laneCount={allLanes.length} carSprites={[car1, car2, car3, car4, car5, car6]}>
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
        <div className="rounded-xl p-6 text-center shadow-2xl max-w-sm" style={{ backgroundColor: GAME_CONFIG.COLORS.MORE_ELEVATED }}>
          <div className="text-2xl font-bold mb-2" style={{ color: GAME_CONFIG.COLORS.BRIGHT_TEXT }}>⚠️ Error</div>
          <div className="text-sm opacity-90 mb-4" style={{ color: GAME_CONFIG.COLORS.SECONDARY_TEXT }}>{gameError}</div>
          <button
            onClick={() => setGameError(null)}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ 
              backgroundColor: GAME_CONFIG.COLORS.PLAY_BUTTON,
              color: GAME_CONFIG.COLORS.BRIGHT_TEXT
            }}
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
          <div className="font-black text-lg px-6" style={{ color: GAME_CONFIG.COLORS.BRIGHT_TEXT }}>WIN!</div>
          <div className="font-bold text-2xl drop-shadow-lg mt-7" style={{ color: GAME_CONFIG.COLORS.BRIGHT_TEXT }}>{lastCashOutAmount.toFixed(2)} ETB</div>
              </div>
              </div>
            </div>
          )}
      </div>


      {/* Bottom Controller UI - Exact Match Design */}
      {/* Enhanced Controller UI */}
      <div className="p-2 sm:p-4">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-2xl shadow-2xl p-3 sm:p-4 lg:p-6" style={{ backgroundColor: GAME_CONFIG.COLORS.MORE_ELEVATED }}>
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 sm:gap-4 lg:gap-6">

              {/* Left Section: Bet Controls */}
            <div className="flex items-center gap-4">
              {/* Bet Amount Control */}
                <div className="flex items-center rounded-xl" style={{ backgroundColor: GAME_CONFIG.COLORS.ELEVATED }}>
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
                    audioManager.playButtonClickAudio();
                    setShowSettings(true);
                  }}
                  className="px-4 py-3 rounded-xl flex items-center justify-center transition-all" style={{ backgroundColor: GAME_CONFIG.COLORS.ELEVATED, color: GAME_CONFIG.COLORS.BRIGHT_TEXT }}>
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
                        audioManager.playButtonClickAudio();
                        setShowDifficultyDropdown(!showDifficultyDropdown);
                      }
                    }}
                    disabled={currentLaneIndex > 0}
                    className={`w-full flex items-center justify-between rounded-xl px-4 py-3 text-left ${currentLaneIndex > 0 ? 'cursor-not-allowed opacity-50' : 'hover:opacity-80'}`} style={{ backgroundColor: GAME_CONFIG.COLORS.ELEVATED }}>
                    <span className="font-medium text-lg" style={{ color: GAME_CONFIG.COLORS.BRIGHT_TEXT }}>{DIFFICULTY_CONFIGS[currentDifficulty].name}</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" className={`transform transition-transform ${showDifficultyDropdown && currentLaneIndex === 0 ? 'rotate-180' : ''}`} style={{ fill: GAME_CONFIG.COLORS.BRIGHT_TEXT }}>
                      <path d="M7 10l5 5 5-5z" />
                    </svg>
              </button>

                  {showDifficultyDropdown && currentLaneIndex === 0 && (
                    <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl overflow-hidden z-50  shadow-2xl" style={{ backgroundColor: GAME_CONFIG.COLORS.ELEVATED }}>
                      {Object.entries(DIFFICULTY_CONFIGS).map(([key, config]) => (
                  <button
                          key={key}
                          onClick={() => {
                            changeDifficulty(key)
                            setShowDifficultyDropdown(false)
                          }}
                          className={`w-full p-4 text-left  transition-colors ${currentDifficulty === key ? 'opacity-80' : ''}`}
                          style={{ backgroundColor: currentDifficulty === key ? GAME_CONFIG.COLORS.MORE_ELEVATED : 'transparent' }}
                        >
                          <div className="font-medium text-lg" style={{ color: GAME_CONFIG.COLORS.BRIGHT_TEXT }}>{config.name}</div>
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
                      className={`px-6 py-3 rounded-xl transition-all whitespace-nowrap font-medium text-base ${currentLaneIndex > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      style={{
                        backgroundColor: currentDifficulty === key ? GAME_CONFIG.COLORS.PLAY_BUTTON : GAME_CONFIG.COLORS.ELEVATED,
                        color: GAME_CONFIG.COLORS.BRIGHT_TEXT,
                        boxShadow: currentDifficulty === key ? `0 4px 6px -1px ${GAME_CONFIG.COLORS.SHADOW_MEDIUM}` : 'none'
                      }}
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
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:opacity-90 active:scale-95 text-white shadow-lg'
                      }`}
                    style={{
                      backgroundColor: !userInfo || (userInfo.balance < betAmount) || isCreatingGame 
                        ? GAME_CONFIG.COLORS.TERTIARY_TEXT 
                        : GAME_CONFIG.COLORS.PLAY_BUTTON,
                      boxShadow: !userInfo || (userInfo.balance < betAmount) || isCreatingGame 
                        ? `0 4px 6px -1px ${GAME_CONFIG.COLORS.SHADOW_LIGHT}` 
                        : `0 4px 6px -1px ${GAME_CONFIG.COLORS.SHADOW_MEDIUM}`
                    }}
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
                      onClick={handleCashOutWithToken}
                      className="w-full h-16 font-bold rounded-xl text-lg transition-all duration-200 hover:opacity-90 active:scale-95 text-black shadow-lg"
                      style={{
                        backgroundColor: GAME_CONFIG.COLORS.CASHOUT_BUTTON,
                        boxShadow: `0 4px 6px -1px ${GAME_CONFIG.COLORS.SHADOW_MEDIUM}`
                      }}
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
                      onClick={moveToNextLaneWithToken}
                      disabled={currentLaneIndex >= allLanes.length || isJumping || isDead || gameEnded}
                      className={`w-full h-16 font-bold rounded-xl text-2xl transition-all duration-200 ${currentLaneIndex >= allLanes.length || isJumping || isDead || gameEnded
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:opacity-90 active:scale-95 text-white shadow-lg'
                        }`}
                      style={{
                        backgroundColor: currentLaneIndex >= allLanes.length || isJumping || isDead || gameEnded
                          ? GAME_CONFIG.COLORS.TERTIARY_TEXT
                          : GAME_CONFIG.COLORS.PLAY_BUTTON,
                        boxShadow: currentLaneIndex >= allLanes.length || isJumping || isDead || gameEnded
                          ? `0 4px 6px -1px ${GAME_CONFIG.COLORS.SHADOW_LIGHT}`
                          : `0 4px 6px -1px ${GAME_CONFIG.COLORS.SHADOW_MEDIUM}`
                      }}
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
          <div className="w-full max-w-lg mx-4 rounded-2xl shadow-2xl" style={{ backgroundColor: GAME_CONFIG.COLORS.BACKGROUND }}>
            {/* Profile header */}
            <div className="px-8 pt-8 pb-6 text-center">
              <div className="mx-auto w-20 h-20 rounded-full overflow-hidden ring-2 ring-gray-600 mb-4">
                <img src={`https://i.pravatar.cc/160?u=${userInfo?.username || 'player'}`} alt="avatar" className="w-full h-full object-cover" />
              </div>
              <div className="text-2xl font-semibold" style={{ color: GAME_CONFIG.COLORS.BRIGHT_TEXT }}>{userInfo?.username || 'Player'}</div>
            </div>

            <div className="border-t border-gray-700" />

            {/* Settings list */}
            <div className="px-6 py-4 space-y-4">
              {/* Music Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg transition-colors hover:opacity-80" style={{ 
                backgroundColor: 'transparent'
              }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: musicEnabled ? GAME_CONFIG.COLORS.PLAY_BUTTON : GAME_CONFIG.COLORS.TERTIARY_TEXT }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
                  </div>
                  <div>
                    <span className="font-medium block" style={{ color: GAME_CONFIG.COLORS.BRIGHT_TEXT }}>Music</span>
                    <span className="text-sm" style={{ color: GAME_CONFIG.COLORS.SECONDARY_TEXT }}>{musicEnabled ? 'Playing' : 'Paused'}</span>
                  </div>
                </div>
                <Switch
                  checked={musicEnabled}
                  onChange={() => {
                    setMusicEnabled(!musicEnabled)
                    if (!musicEnabled && audioManager.current) {
                      audioManager.current.play().catch(e => console.log('Music play failed:', e))
                    } else if (musicEnabled && audioManager.current) {
                      audioManager.current.pause()
                    }
                  }}
                  onColor={GAME_CONFIG.COLORS.PLAY_BUTTON}
                  offColor={GAME_CONFIG.COLORS.TERTIARY_TEXT}
                  checkedIcon={false}
                  uncheckedIcon={false}
                  height={32}
                  width={64}
                  handleDiameter={28}
                />
              </div>

              {/* Sound Effects Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg transition-colors hover:opacity-80" style={{ backgroundColor: 'transparent' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: soundEnabled ? GAME_CONFIG.COLORS.PLAY_BUTTON : GAME_CONFIG.COLORS.TERTIARY_TEXT }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" style={{ fill: GAME_CONFIG.COLORS.BRIGHT_TEXT }}><path d="M3 9v6h4l5 5V4L7 9H3z" /></svg>
                  </div>
                  <div>
                    <span className="font-medium block" style={{ color: GAME_CONFIG.COLORS.BRIGHT_TEXT }}>Sound Effects</span>
                    <span className="text-sm" style={{ color: GAME_CONFIG.COLORS.SECONDARY_TEXT }}>{soundEnabled ? 'Enabled' : 'Disabled'}</span>
                  </div>
                </div>
                <Switch
                  checked={soundEnabled}
                  onChange={() => setSoundEnabled(!soundEnabled)}
                  onColor={GAME_CONFIG.COLORS.PLAY_BUTTON}
                  offColor={GAME_CONFIG.COLORS.TERTIARY_TEXT}
                  checkedIcon={false}
                  uncheckedIcon={false}
                  height={32}
                  width={64}
                  handleDiameter={28}
                />
              </div>

              <div className="border-t border-gray-700" />

             
              {/* How to Play */}
              <button 
                onClick={() => {
                  setShowHowToPlay(true)
                  setShowSettings(false)
                }}
                className="w-full flex items-center gap-3 text-left hover:opacity-80 p-3 rounded-lg"
                style={{ backgroundColor: 'transparent' }}
              >
                <div className="w-8 h-8 flex items-center justify-center"><span className="text-lg">ℹ️</span></div>
                <span className="font-medium" style={{ color: GAME_CONFIG.COLORS.BRIGHT_TEXT }}>How to Play</span>
              </button>
            </div>

            <div className="px-6 pb-6 pt-2 flex justify-end">
              <button 
                onClick={() => setShowSettings(false)} 
                className="px-4 py-2 rounded-lg hover:opacity-80"
                style={{ 
                  backgroundColor: GAME_CONFIG.COLORS.ELEVATED,
                  color: GAME_CONFIG.COLORS.BRIGHT_TEXT
                }}
              >Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Menu Overlay */}
      {showMenu && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-end sm:items-center justify-center z-50">
          <div className="rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-sm sm:mx-4 max-h-[80vh] overflow-y-auto" style={{ backgroundColor: GAME_CONFIG.COLORS.MORE_ELEVATED }}>
            {/* User Profile Section */}
            <div className="flex items-center gap-3 mb-6">
              {userInfo ? (
                <>
                  <div className="flex-1">
                    <div className="font-medium" style={{ color: GAME_CONFIG.COLORS.BRIGHT_TEXT }}>@{userInfo.username}</div>
                    <div className="text-sm flex items-center gap-1" style={{ color: GAME_CONFIG.COLORS.SECONDARY_TEXT }}>
                      <FaCoins className="text-xs" style={{ color: GAME_CONFIG.COLORS.CASHOUT_BUTTON }} />
                      {userInfo.balance?.toFixed(2) || '0.00'} ETB
                    </div>
                  </div>
                </>
              ) : (
                <div className="animate-pulse flex items-center gap-3 w-full">
                  <div className="w-12 h-12 rounded-full" style={{ backgroundColor: GAME_CONFIG.COLORS.TERTIARY_TEXT }}></div>
                  <div className="flex-1">
                    <div className="h-4 w-24 rounded mb-2" style={{ backgroundColor: GAME_CONFIG.COLORS.TERTIARY_TEXT }}></div>
                    <div className="h-3 w-16 rounded" style={{ backgroundColor: GAME_CONFIG.COLORS.TERTIARY_TEXT }}></div>
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
                className="w-full flex items-center gap-3 text-left hover:opacity-80 p-2 rounded"
                style={{ backgroundColor: 'transparent' }}
              >
                <div className="w-6 h-6 flex items-center justify-center">
                  <span className="text-lg">ℹ️</span>
                </div>
                <span style={{ color: GAME_CONFIG.COLORS.BRIGHT_TEXT }}>How to play?</span>
              </button>

              <Link
                to="/preview"
                className="w-full flex items-center gap-3 text-left hover:opacity-80 p-2 rounded"
                onClick={() => setShowMenu(false)}
                style={{ backgroundColor: 'transparent' }}
              >
                <div className="w-6 h-6 flex items-center justify-center">
                  <span className="text-lg">🐔</span>
                </div>
                <span style={{ color: GAME_CONFIG.COLORS.BRIGHT_TEXT }}>Chicken Animation Preview</span>
              </Link>
            </div>

            {/* Footer */}
            <div className="text-center">
              <div className="text-sm mb-2" style={{ color: GAME_CONFIG.COLORS.SECONDARY_TEXT }}>Powered by</div>
              <div className="flex items-center justify-center gap-1">
                <span className="font-bold text-lg" style={{ color: GAME_CONFIG.COLORS.CASHOUT_BUTTON }}>IN</span>
                <span className="font-bold text-lg" style={{ color: GAME_CONFIG.COLORS.BRIGHT_TEXT }}>OUT</span>
                <span className="text-lg" style={{ color: GAME_CONFIG.COLORS.CASHOUT_BUTTON }}>→</span>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={() => setShowMenu(false)}
              className="absolute top-4 right-4 hover:opacity-80"
              style={{ color: GAME_CONFIG.COLORS.SECONDARY_TEXT }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* How to Play Modal */}
      {showHowToPlay && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="p-6 max-w-md rounded-2xl shadow-2xl" style={{ backgroundColor: '#444444' }}>
            <h3 className="text-xl font-bold mb-4 text-white">How to Play</h3>
            <div className="space-y-2 text-sm text-gray-300">
              <p>1. Set your bet amount and difficulty level</p>
              <p>2. Click "Play" to start the round</p>
              <p>3. The chicken will automatically move across multiplier zones</p>
              <p>4. Cash out before the chicken gets shot down to win</p>
              <p>5. Higher difficulty = higher risk but better multipliers</p>
            </div>
            <button
              onClick={() => setShowHowToPlay(false)}
              className="mt-4 w-full bg-green-600 hover:bg-green-700 py-2 rounded-lg font-medium text-white"
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