import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useGetUserInfo } from '../utils/getUserinfo'
import gameApi from '../utils/gameApi'
import socketGameAPI from '../utils/socketApi'
import { useAudioManager } from '../hooks/useAudioManager'
import { useGameState } from '../hooks/useGameState'
import { useGameLogic } from '../hooks/useGameLogic'
import ENV_CONFIG from '../utils/envConfig'
import { FaCoins, FaCog } from 'react-icons/fa'
import Switch from 'react-switch'
import { Howl, Howler } from 'howler'
import logoImage from '../assets/logo.png'
import deadChickenImage from '../assets/chickendead.png'
import winNotificationImage from '../assets/winNotification.aba8bdcf.png'
import finalSideRoadImage from '../assets/final.png'
import backgroundMusic from '../assets/audio/ChickenRoadClient.webm'
import cashoutAudio from '../assets/audio/cashout.a30989e2.mp3'
import crashAudio from '../assets/audio/crash.6d250f25.mp3'
import chickenOverAudio from '../assets/audio/chick.ffd1f39b.mp3'
import buttonClickAudio from '../assets/audio/buttonClick.mp3'
import jumpAudio from '../assets/audio/jump.mp3'
import Lane from './Lane'
import SettingsModal from './SettingsModal'
import MobileMenu from './MobileMenu'
import CashOutAnimation from './CashOutAnimation'
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
      autoplay: false,
      onload: () => {},
      onplay: () => {},
      onpause: () => {},
      onerror: () => {}
    })

    this.cashoutSound = new Howl({
      src: [cashoutAudio],
      volume: 0.7,
      onload: () => {},
      onplay: () => {},
      onerror: () => {}
    })

    this.crashSound = new Howl({
      src: [crashAudio],
      volume: 0.6,
      onload: () => {},
      onplay: () => {},
      onerror: () => {}
    })

    this.buttonClickSound = new Howl({
      src: [buttonClickAudio],
      volume: 0.5,
      onload: () => {},
      onplay: () => {},
      onerror: () => {}
    })

    this.jumpSound = new Howl({
      src: [jumpAudio],
      volume: 0.4,
      onload: () => {},
      onplay: () => {},
      onerror: () => {}
    })

    this.chickenOverSound = new Howl({
      src: [chickenOverAudio],
      volume: 0.6,
      onload: () => {},
      onplay: () => {},
      onerror: () => {}
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

  playChickenOver() {
    this.chickenOverSound.play()
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
      1.01, 1.03, 1.06, 1.10, 1.15, 1.19, 1.24, 1.30, 1.35, 1.42,
      1.48, 1.56, 1.65, 1.75, 1.85, 1.98, 2.12, 2.28, 2.47, 2.70,
      2.96, 3.28, 3.70, 4.11, 4.64, 5.39, 6.50, 8.36, 12.08, 23.24
    ]
  },
  medium: {
    name: "Medium Mode",
    lanes: 25,
    startingMultiplier: 1.08,
    maxMultiplier: 500,
    multipliers: [
      1.08, 1.21, 1.37, 1.56, 1.78, 2.05, 2.37, 2.77, 3.24, 3.85, 4.62,
      5.61, 6.91, 8.64, 10.99, 14.29, 18.96, 26.07, 37.24, 53.82, 82.36, 137.59, 265.35, 638.82, 2457.00
    ]
  },
  hard: {
    name: "Hard Mode",
    lanes: 22,
    startingMultiplier: 1.18,
    maxMultiplier: 1000,
    multipliers: [
      1.18, 1.46, 1.83, 2.31, 2.95, 3.82, 5.02, 6.66, 9.04, 12.52,
      17.74, 25.80, 38.71, 60.21, 97.34, 166.87, 305.94, 595.86, 1283.03, 3267.64, 10898.54, 62162.09
    ]
  },
  extreme: {
    name: "Extreme Mode",
    lanes: 18,
    startingMultiplier: 1.44,
    maxMultiplier: 3608855,
    multipliers: [
      1.44, 2.21, 3.45, 5.53, 9.09, 15.30, 26.78, 48.70, 92.54, 185.08,
      391.25, 893.22, 2235.72, 6096.15, 18960.33, 72432.75, 379632.82, 3608855.25
    ]
  }
}
 
function Chicken() {
  const [token, setToken] = useState(null)
  const [tenantId, setTenantId] = useState(null) // Store tenantId for multi-bot mode
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
      socketGameAPI.connect(token, tenantId); // Pass tenantId
    }

    return () => {
      socketGameAPI.disconnect();
    };
  }, [token, tenantId]);

  // Initialize audio manager and game logic hooks
  const audioManager = useAudioManager(soundEnabled, musicEnabled)
  const gameLogic = useGameLogic(gameStateHook, audioManager.audioManager, tenantId) // Pass tenantId

  // Initialize lanes based on difficulty
  useEffect(() => {
    const newLanes = generateLanesForDifficulty(DIFFICULTY_CONFIGS, currentDifficulty)
    setAllLanes(newLanes)
  }, [currentDifficulty, setAllLanes])

  // Traffic is managed by TrafficProvider; no direct init here to avoid double-control

  // Token and tenantId handling
  useEffect(() => {
    // Extract token and tenantId from URL parameters
    const params = new URLSearchParams(window.location.search)
    const newToken = params.get("token")
    const newTenantId = params.get("tenantId")

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

    // Store tenantId if multi-bot mode
    if (ENV_CONFIG.isMultiBot) {
      if (newTenantId) {
        localStorage.setItem("tenantId", newTenantId)
        setTenantId(newTenantId)
      } else {
        // Get tenantId from localStorage if not in URL
        const storedTenantId = localStorage.getItem("tenantId")
        if (storedTenantId) {
          setTenantId(storedTenantId)
        }
      }
    }
  }, [])

  // Predictive blocker: ask server if the next lane is allowed; if not, show blocker there
  // Disable HTTP predictive blocker; rely on socket result timing
  useEffect(() => {
    setBlockedNextLane(false)
  }, [currentLaneIndex])

  const { userInfo, isLoading: userLoading, error: userError, refetch } = useGetUserInfo(token, tenantId) // Pass tenantId
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
    if (!isNaN(value)) {
      const clamped = Math.max(0.50, Math.min(200, value))
      setBetAmount(parseFloat(clamped.toFixed(2)))
    }
  }

  // Initialize Howler.js audio manager
  useEffect(() => {
    
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
      finalSideRoadImage,
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

  // Handler for DynamicCar blocked stop (unified audio)
  const handleCarBlockedStop = () => {
    audioManager.playCrashAudio()
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

      

      // Create game via WebSocket for speed
      const gameData = await socketGameAPI.createGame({
        clientSeed: gameApi.generateClientSeed(),
        difficulty: currentDifficulty,
        betAmount: betAmount,
        creatorChatId: userInfo.chatId
      }, token, tenantId); // Pass tenantId

      

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
        <header className="px-1 flex items-center justify-between border-b" style={{ backgroundColor: GAME_CONFIG.COLORS.BACKGROUND, borderColor: GAME_CONFIG.COLORS.TERTIARY_TEXT }}>
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
          <button
            className="p-2 rounded-xl flex items-center justify-center transition-all"
            style={{ backgroundColor: GAME_CONFIG.COLORS.ELEVATED, color: GAME_CONFIG.COLORS.BRIGHT_TEXT }}
            onClick={() => {
              audioManager.playButtonClickAudio();
              setShowSettings(true);
            }}
          >
            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" className="text-lg" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M487.4 315.7l-42.6-24.6c4.3-23.2 4.3-47 0-70.2l42.6-24.6c4.9-2.8 7.1-8.6 5.5-14-11.1-35.6-30-67.8-54.7-94.6-3.8-4.1-10-5.1-14.8-2.3L380.8 110c-17.9-15.4-38.5-27.3-60.8-35.1V25.8c0-5.6-3.9-10.5-9.4-11.7-36.7-8.2-74.3-7.8-109.2 0-5.5-1.2-9.4-6.1-9.4 11.7V75c-22.2 7.9-42.8 19.8-60.8 35.1L88.7 85.5c-4.9-2.8-11-1.9-14.8 2.3-24.7 26.7-43.6 58.9-54.7 94.6-1.7 5.4.6 11.2 5.5 14L67.3 221c-4.3 23.2-4.3 47 0 70.2l-42.6 24.6c-4.9 2.8-7.1 8.6-5.5 14 11.1 35.6 30 67.8 54.7 94.6 3.8 4.1 10 5.1 14.8 2.3l42.6-24.6c17.9 15.4 38.5 27.3 60.8 35.1v49.2c0 5.6 3.9 10.5 9.4 11.7 36.7 8.2 74.3 7.8 109.2 0 5.5-1.2 9.4-6.1 9.4-11.7v-49.2c22.2-7.9 42.8-19.8 60.8-35.1l42.6 24.6c4.9 2.8 11 1.9 14.8-2.3 24.7-26.7 43.6-58.9 54.7-94.6 1.5-5.5-.7-11.3-5.6-14.1zM256 336c-44.1 0-80-35.9-80-80s35.9-80 80-80 80 35.9 80 80-35.9 80-80 80z"></path></svg>
          </button>
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
            isValidatingNext={isValidatingNext}
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

        <CashOutAnimation show={showCashOutAnimation} amount={lastCashOutAmount} />
      </div>


      {/* Bottom Controller UI - Exact Match Design */}
      {/* Enhanced Controller UI */}
      <div className="p-2 sm:p-4">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-2xl shadow-2xl p-2 sm:p-4 lg:p-6" style={{ backgroundColor: GAME_CONFIG.COLORS.ELEVATED }}>
            {/* Desktop-only helper text */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4 lg:gap-6">

              {/* Left Section: Bet Controls */}
            <div className="flex items-center gap-4">
              {/* Bet Amount Control using MIN / input / MAX with quick selections */}
                <div className="flex flex-col gap-2 grow">
                  <div className="flex items-center rounded-xl px-2" style={{ backgroundColor: GAME_CONFIG.COLORS.MORE_ELEVATED }}>
                    <button
                      data-testid="min-bet-button"
                      onClick={() => {
                        if (currentLaneIndex > 0) return
                        setBetAmount(0.5)
                      }}
                      disabled={currentLaneIndex > 0}
                      className={`px-3 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold transition-all ${currentLaneIndex > 0 ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80 active:scale-95'}`}
                    >
                      MIN
                    </button>
                    <div className="flex-1 text-center px-2">
                      <input
                        data-testid="bet-input"
                        type="text"
                        maxLength={10}
                        placeholder="Amount"
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
                      data-testid="max-bet-button"
                      onClick={() => {
                        if (currentLaneIndex > 0) return
                        const balanceMax = typeof userInfo?.balance === 'number' ? Math.floor(userInfo.balance * 100) / 100 : 200
                        const max = Math.min(200, Math.max(0.5, balanceMax))
                        setBetAmount(parseFloat(max.toFixed(2)))
                      }}
                      disabled={currentLaneIndex > 0}
                      className={`px-3 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold transition-all ${currentLaneIndex > 0 ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80 active:scale-95'}`}
                      style={{ backgroundColor: 'transparent' }}
                    >
                      MAX
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    {[0.5, 1, 2, 7].map((amt, idx) => (
                      <button
                        key={amt}
                        data-testid={`fast-bet-${idx + 1}`}
                        onClick={() => {
                          if (currentLaneIndex > 0) return
                          setBetAmount(amt)
                        }}
                        disabled={currentLaneIndex > 0}
                        className={`px-3 grow rounded-lg flex items-center gap-1 text-white text-sm font-semibold p-2 transition-all ${currentLaneIndex > 0 ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80 active:scale-95'}`}
                        style={{ backgroundColor: GAME_CONFIG.COLORS.MORE_ELEVATED }}
                      >
                        <span>{amt}</span>
                        <span style={{ color: GAME_CONFIG.COLORS.SECONDARY_TEXT }}>birr</span>
                      </button>
                    ))}
                  </div>
                </div>
            </div>

              {/* Center Section: Difficulty Selector */}
              <div
                className={`flex-1 transition-opacity duration-300 difficulty-selector relative`}
                style={{
                  opacity: (currentLaneIndex > 0 || isJumping || isCreatingGame) ? 0.6 : 1,
                  pointerEvents: currentLaneIndex > 0 ? 'none' : 'auto'
                }}
              >
                {/* Mobile: Dropdown */}
                <div className="lg:hidden">
              <button
                    onClick={() => {
                      if (currentLaneIndex === 0) {
                        audioManager.playButtonClickAudio();
                        setShowDifficultyDropdown(!showDifficultyDropdown);
                      }
                    }}
                    disabled={currentLaneIndex > 0 || isJumping || isCreatingGame}
                    className={`w-full flex items-center justify-between rounded-xl px-4 text-left ${(currentLaneIndex > 0 || isJumping || isCreatingGame) ? 'cursor-not-allowed opacity-50' : 'hover:opacity-80'}`} style={{ backgroundColor: GAME_CONFIG.COLORS.ELEVATED }}>
                    <span className="font-semibold text-sm" style={{ color: GAME_CONFIG.COLORS.BRIGHT_TEXT }}>{DIFFICULTY_CONFIGS[currentDifficulty].name}</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" className={`transform transition-transform ${showDifficultyDropdown && currentLaneIndex === 0 ? 'rotate-180' : ''}`} style={{ fill: GAME_CONFIG.COLORS.BRIGHT_TEXT }}>
                      <path d="M7 10l5 5 5-5z" />
                    </svg>
              </button>

                  {showDifficultyDropdown && currentLaneIndex === 0 && !isJumping && !isCreatingGame && (
                    <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl overflow-hidden z-50  shadow-2xl" style={{ backgroundColor: GAME_CONFIG.COLORS.ELEVATED }}>
                      {Object.entries(DIFFICULTY_CONFIGS).map(([key, config]) => (
                  <button
                          key={key}
                          onClick={() => {
                            changeDifficulty(key)
                            setShowDifficultyDropdown(false)
                          }}
                          className={`w-full p-2 text-left  transition-colors ${currentDifficulty === key ? 'opacity-80' : ''}`}
                          style={{ backgroundColor: currentDifficulty === key ? GAME_CONFIG.COLORS.ELEVATED : 'transparent' }}
                        >
                          <div className="font-semibold text-sm" style={{ color: GAME_CONFIG.COLORS.BRIGHT_TEXT }}>{config.name}</div>
                  </button>
                      ))}
                    </div>
                  )}
              </div>

                {/* Desktop: Inline Pills with label */}
                <div className="hidden lg:flex flex-col items-start justify-center gap-2">
                  <div className="font-medium mr-3" style={{ color: GAME_CONFIG.COLORS.SECONDARY_TEXT }}>
                    Difficulty
                  </div>
                <div className="flex gap-2">  
                  {Object.entries(DIFFICULTY_CONFIGS).map(([key, config]) => (
                  <button
                      key={key}
                      onClick={() => changeDifficulty(key)}
                      disabled={currentLaneIndex > 0 || isJumping || isCreatingGame}
                      className={`px-6 py-3 shadow-lg rounded-xl transition-all whitespace-nowrap font-medium text-base ${(currentLaneIndex > 0 || isJumping || isCreatingGame) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      style={{
                        backgroundColor: currentDifficulty === key ? GAME_CONFIG.COLORS.PLAY_BUTTON : GAME_CONFIG.COLORS.ELEVATED,
                        color: GAME_CONFIG.COLORS.BRIGHT_TEXT,
                      }}
                    >
                      {config.name}
                  </button>
                  ))}
                </div>
                </div>
             </div>

              {/* Right Section: Game Control Buttons */}
              <div className="flex items-center gap-4">
                {currentLaneIndex === 0 ? (
                  /* Initial Play Button - Before Game Starts (structured wrapper without external classes) */
                  <div className="w-full lg:w-48">
                    <button
                      onClick={startNewGame}
                      disabled={!userInfo || (userInfo.balance < betAmount) || isCreatingGame || isJumping}
                      className={`w-full h-[100px] font-bold px-8 rounded-xl text-xl transition-all duration-200 ${(!userInfo || (userInfo.balance < betAmount))
                        ? 'opacity-50 cursor-not-allowed'
                        : 'active:scale-95 text-white shadow-lg'
                        }`}
                      style={{
                        backgroundColor: (!userInfo || (userInfo.balance < betAmount))
                          ? GAME_CONFIG.COLORS.TERTIARY_TEXT
                          : GAME_CONFIG.COLORS.PLAY_BUTTON,
                        opacity: (isCreatingGame || isJumping) ? 0.7 : 1,
                        cursor: (isCreatingGame || isJumping) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {isCreatingGame ? 'Creating...' : isJumping ? 'Play' :
                        !userInfo ? 'Loading...' :
                          (userInfo.balance < betAmount) ? 'Insufficient Balance' : 'Play'}
                    </button>
                  </div> 
                ) : (
                  /* Dual Button Layout - During Game */
                  <div className="grid grid-cols-2 gap-3 w-full lg:w-64">
                    {/* Cash Out Button */}
              <button 
                      onClick={handleCashOutWithToken}
                      disabled={isValidatingNext || isJumping}
                      className="w-full h-[100px] font-bold rounded-xl text-lg transition-all duration-200 active:scale-95 text-black shadow-lg hover:opacity-90"
                      style={{
                        backgroundColor: GAME_CONFIG.COLORS.CASHOUT_BUTTON,
                        opacity: isValidatingNext || isJumping ? 0.7 : 1
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
                      className={`w-full h-[100px] font-bold rounded-xl text-2xl transition-all duration-200 active:scale-95 text-white shadow-lg hover:opacity-90 ${currentLaneIndex >= allLanes.length || isDead || gameEnded ? 'cursor-not-allowed' : ''}`}
                      style={{
                        backgroundColor: currentLaneIndex >= allLanes.length || isDead || gameEnded
                          ? GAME_CONFIG.COLORS.TERTIARY_TEXT
                          : GAME_CONFIG.COLORS.PLAY_BUTTON,
                        opacity: (isValidatingNext || isJumping) && currentLaneIndex < allLanes.length && !isDead && !gameEnded ? 0.6 : (currentLaneIndex >= allLanes.length || isDead || gameEnded ? 0.5 : 1)
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

      <SettingsModal
        show={showSettings}
        onClose={() => setShowSettings(false)}
        userInfo={userInfo}
        musicEnabled={musicEnabled}
        setMusicEnabled={setMusicEnabled}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        audioManager={audioManager}
      />

      <MobileMenu
        show={showMenu}
        onClose={() => setShowMenu(false)}
        userInfo={userInfo}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        musicEnabled={musicEnabled}
        setMusicEnabled={setMusicEnabled}
        audioManager={audioManager}
      />

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