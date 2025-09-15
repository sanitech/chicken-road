import React, { useState, useEffect } from 'react'
import { useGetUserInfo } from '../utils/getUserinfo'
import { gameApi, generateClientSeed } from '../utils/gameApi'
import { FaCoins } from 'react-icons/fa'
import audioManager from '../utils/audioUtils'
import logoImage from '../assets/logo.png'
import deadChickenImage from '../assets/chickendead.png'
import winNotificationImage from '../assets/winNotification.aba8bdcf.png'
import Lane from './Lane'
import RoadDisplay from './RoadDisplay'

// Difficulty configurations from server - no API requests needed
const DIFFICULTY_CONFIGS = {
  easy: {
    name: "Easy Mode",
    lanes: 20,
    startingMultiplier: 1.03,
    maxMultiplier: 50,
    houseEdge: 4.5, // 95.5% RTP
    rtp: 95.5,
    multipliers: [1.03, 1.06, 1.10, 1.15, 1.20, 1.25, 1.30, 1.35, 1.40, 1.45, 1.50, 1.55, 1.60, 1.65, 1.70, 1.75, 1.80, 1.85, 1.90, 50.0]
  },
  medium: {
    name: "Medium Mode",
    lanes: 25,
    startingMultiplier: 1.08,
    maxMultiplier: 500,
    houseEdge: 4.5, // 95.5% RTP
    rtp: 95.5,
    multipliers: [1.08, 1.15, 1.25, 1.35, 1.45, 1.55, 1.65, 1.75, 1.85, 1.95, 2.05, 2.15, 2.25, 2.35, 2.45, 2.55, 2.65, 2.75, 2.85, 3.0, 3.2, 3.4, 3.6, 4.0, 500.0]
  },
  hard: {
    name: "Hard Mode",
    lanes: 22,
    startingMultiplier: 1.18,
    maxMultiplier: 1000,
    houseEdge: 4.5, // 95.5% RTP
    rtp: 95.5,
    multipliers: [1.18, 1.25, 1.35, 1.45, 1.55, 1.65, 1.75, 1.85, 1.95, 2.05, 2.15, 2.25, 2.35, 2.45, 2.55, 2.65, 2.75, 2.85, 3.0, 3.2, 3.4, 1000.0]
  },
  extreme: {
    name: "Extreme Mode",
    lanes: 18,
    startingMultiplier: 1.44,
    maxMultiplier: 3608855,
    houseEdge: 4.5, // 95.5% RTP
    rtp: 95.5,
    multipliers: [1.44, 1.55, 1.68, 1.82, 1.98, 2.15, 2.35, 2.58, 2.84, 3.15, 3.5, 3.9, 4.35, 4.85, 5.4, 6.0, 6.7, 3608855.0]
  }
}

const INITIAL_MULTIPLIERS = DIFFICULTY_CONFIGS.easy.multipliers
 
function Chicken() {
  const [token, setToken] = useState(null)
  const [gameState, setGameState] = useState({
    balance: 0,
    betAmount: 10,
    difficulty: 'easy',
  })

  // Game states
  const [difficulties, setDifficulties] = useState(DIFFICULTY_CONFIGS)
  const [currentGame, setCurrentGame] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [gameResult, setGameResult] = useState(null)

  // Lane movement state
  const [currentLaneIndex, setCurrentLaneIndex] = useState(0) // Start at lane 0 (sidewalk)
  const [movedLanes, setMovedLanes] = useState([0]) // Track all lanes the chicken has moved through
  const [currentMultipliers, setCurrentMultipliers] = useState(INITIAL_MULTIPLIERS) // Dynamic multipliers array
  
  // Jump physics state
  const [isJumping, setIsJumping] = useState(false)
  const [jumpProgress, setJumpProgress] = useState(0) // 0 to 1, progress through jump
  const [jumpStartLane, setJumpStartLane] = useState(0)
  const [jumpTargetLane, setJumpTargetLane] = useState(0)

  // Win notification state
  const [showWinNotification, setShowWinNotification] = useState(false)
  
  // Crash control state
  const [crashIndex, setCrashIndex] = useState(5) // Default crash at index 5
  const [gameEnded, setGameEnded] = useState(false) // Track if game has ended due to crash
  const [isDead, setIsDead] = useState(false) // Track if chicken is dead
  const [crashDelay, setCrashDelay] = useState(0) // Track crash delay countdown (crashed)
  
  // Range display state - responsive window size
  const [windowSize, setWindowSize] = useState(3) // Start with mobile size, will be updated on mount
 
  const [showHowToPlay, setShowHowToPlay] = useState(false)
  const [showDifficultyDropdown, setShowDifficultyDropdown] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [musicEnabled, setMusicEnabled] = useState(false)

  // Handle token
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

  const { userInfo } = useGetUserInfo(token)

  // Set responsive window size based on screen width
  useEffect(() => {
    const updateWindowSize = () => {
      if (window.innerWidth < 768) {
        setWindowSize(3) // Mobile: 3 lanes
      } else {
        setWindowSize(7) // Desktop: 7 lanes
      }
    }

    // Set initial size
    updateWindowSize()

    // Listen for resize events
    window.addEventListener('resize', updateWindowSize)
    
    return () => window.removeEventListener('resize', updateWindowSize)
  }, [])

  // Update balance when user info changes
  useEffect(() => {
    if (userInfo?.balance !== undefined) {
      setGameState(prev => ({
        ...prev,
        balance: userInfo.balance
      }))
    }
  }, [userInfo])

  // Update multipliers when difficulty changes
  useEffect(() => {
    const config = DIFFICULTY_CONFIGS[gameState.difficulty]
    if (config) {
      setCurrentMultipliers(config.multipliers)
    }
  }, [gameState.difficulty])


  // Start a new game
  const startNewGame = async () => {
    try {
      setIsPlaying(true)
      setGameResult(null)
      setCurrentLaneIndex(0)
      setMovedLanes([0])
      setGameEnded(false)
      setIsDead(false)

      const creatorChatId = userInfo?.chatId || userInfo?.id || 'guest';

      const result = await gameApi.createGame({
        difficulty: gameState.difficulty,
        betAmount: gameState.betAmount,
        creatorChatId
      })

      setCurrentGame(result)
      setGameResult(result)

      // Update multipliers based on difficulty (using local config)
      const config = DIFFICULTY_CONFIGS[gameState.difficulty]
      if (config) {
        setCurrentMultipliers(config.multipliers)
        setCrashIndex((result.crashLane ?? result.fallStep) + 1)
      }

      // Automatically jump to first multiplier lane after game starts
      setTimeout(() => {
        startJump(1) // Jump from sidewalk (0) to first multiplier lane (1)
      }, 500) // Small delay to show the game started

    } catch (error) {
      setIsPlaying(false)
      alert(`Failed to start game: ${error.message}`)
    }
  }

  // Calculate dynamic range - 6 lanes on desktop, 2-3 on mobile
  const calculateDynamicRange = () => {
    const totalLanes = currentMultipliers.length
    const isMobile = window.innerWidth < 768
    const maxLanes = isMobile ? 3 : 6 // 3 lanes on mobile, 6 on desktop
    
    // Always show from lane 0 for fixed lane display
    return { start: 0, end: Math.min(maxLanes - 1, totalLanes - 1) }
  }

  // Get multipliers for display within the dynamic range
  const getAllMultipliers = () => {
    const range = calculateDynamicRange()
    // Show all multipliers starting from index 0 (1.01x)
    return currentMultipliers.slice(range.start, range.end + 1)
  }

  // Function to move chicken to next lane
  const moveToNextLane = async () => {
    if (!currentGame || gameEnded) return

    const nextIndex = currentLaneIndex + 1

    try {
      const moveCheck = await gameApi.canMove(currentGame.gameId, nextIndex)

      if (!moveCheck.canMove) {
      setGameEnded(true)
        setIsDead(true)
        setIsPlaying(false)
        setCrashIndex((moveCheck.crashLane ?? nextIndex) + 1)
        
        // Play crash sound
        audioManager.playCrashSound()
        audioManager.playLoseSound()
        
        // Start crash delay countdown
        setCrashDelay(3) // Start with 3 seconds
        
        // Countdown timer
        const countdownInterval = setInterval(() => {
          setCrashDelay(prev => {
            if (prev <= 1) {
              clearInterval(countdownInterval)
              // Reset game after countdown
              setIsDead(false)
              setGameEnded(false)
              setCurrentLaneIndex(0)
              setMovedLanes([0])
              setCurrentMultipliers(INITIAL_MULTIPLIERS)
              setCrashIndex(0)
              setCurrentGame(null)
              setGameResult(null)
              setCrashDelay(0)
              return 0
            }
            return prev - 1
          })
        }, 1000)
        
      return
    }

      // Start jump animation to next lane
      startJump(nextIndex)
    } catch (e) {
      console.error('Move failed:', e)
    }
  }

  // Physics-based jump function with smooth easing
  const startJump = (targetLane) => {
    if (isJumping) return // Prevent multiple jumps

    setIsJumping(true)
    setJumpStartLane(currentLaneIndex)
    setJumpTargetLane(targetLane)
    setJumpProgress(0)

    // Animate the jump with physics-based easing
    const jumpDuration = 800 // 800ms jump duration
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
    setIsJumping(false)
    setJumpProgress(0)
    setCurrentLaneIndex(targetLane)

    // Play chicken sound for successful jump
    audioManager.playChickenSound()

    // Update moved lanes
    setMovedLanes(prevLanes => {
      const newLanes = [...prevLanes, targetLane]
        return newLanes
    })

    // Remove first multiplier when reaching lane 2 (index 2)
    if (targetLane === 2) {
      setCurrentMultipliers(prev => prev.slice(1))
    }
  }

  // Calculate potential winnings for each multiplier
  const calculateWinnings = (multiplier) => {
    return gameState.betAmount * multiplier
  }

  // Cash out function
  const cashOut = async () => {
    if (!currentGame || gameEnded || !isPlaying) return

    try {
      const result = await gameApi.cashOut(currentGame.gameId, currentLaneIndex)

      setIsPlaying(false)
      setGameEnded(true)
      setGameResult(result)

      // Play win sound
      audioManager.playWinSound()
      audioManager.playCashOutSound()

      // Show win notification
      setShowWinNotification(true)
      setTimeout(() => {
        setShowWinNotification(false)
      }, 3000) // Show for 3 seconds

      // Add success effect
      const gameArea = document.querySelector('.game-area')
      if (gameArea) {
        gameArea.classList.add('success-effect')
        setTimeout(() => {
          gameArea.classList.remove('success-effect')
        }, 600)
      }

      // Update user balance if available
      if (result.winAmount && userInfo) {
        // The balance will be updated by the wallet system
      }

    } catch (error) {
      // Don't end the game if cash out fails
    }
  }

  // Reset game function
  const resetGame = () => {
    setCurrentLaneIndex(0)
    setMovedLanes([0])
    setCurrentMultipliers(INITIAL_MULTIPLIERS)
    setGameEnded(false)
    setIsDead(false) // Reset dead state when game is reset
  }



  return (
    <>
    <div className="h-screen game-container text-white flex flex-col">
      {/* Header - Matching Image Design */}
      <header className="game-header px-2 py-4 flex items-center justify-between bg-gray-800">
        {/* Left side - Logo and Game Title */}
        <div className="w-44">
          <img
            src={logoImage}
            alt="Chicken Road 2 Logo"
            className="object-contain"
          />
        </div>

        {/* Center-Right - Balance */}
        <div className='flex items-center gap-2'>
          <div className="flex items-center">
            <span className="text-white font-bold text-base">{(userInfo?.balance || 0).toFixed(2)}</span>
            <span className="text-green-500 font-bold text-base ml-2">ETB</span>
            </div>

          {/* Right side - Menu Icon */}
          <div className="flex items-center">
          <button
            onClick={() => setShowMenu(!showMenu)}
              className="w-10 h-8 bg-gray-600 rounded flex items-center justify-center hover:bg-gray-500"
            >
              <div className="flex flex-col space-y-1">
                <div className="w-4 h-0.5 bg-white"></div>
                <div className="w-4 h-0.5 bg-white"></div>
                <div className="w-4 h-0.5 bg-white"></div>
              </div>
          </button>
          </div>
        </div>
      </header>

      {/* Main Game Area - Full Width */}
      <div className="flex-1 flex flex-col">
        {/* Game Area - Lane Display */}
        <div className="flex-1 relative bg-gray-900 min-h-0 game-area">
              {/* Lane component with dynamic range */}
              <Lane
                remainingMultipliers={getAllMultipliers()}
                currentIndex={Math.max(0, currentLaneIndex - calculateDynamicRange().start)}
                displayIndex={Math.max(0, currentLaneIndex - calculateDynamicRange().start)}
                globalCurrentIndex={currentLaneIndex}
                globalDisplayStart={calculateDynamicRange().start}
                isDead={gameEnded && currentLaneIndex >= crashIndex - 1}
                crashIndex={crashIndex}
                shouldAnimateCar={currentLaneIndex >= crashIndex - 1 && !gameEnded}
                gameEnded={gameEnded}
                betAmount={gameState.betAmount}
                isJumping={isJumping}
                jumpProgress={jumpProgress}
                jumpStartLane={jumpStartLane}
                jumpTargetLane={jumpTargetLane}
              />
            </div>
          </div>

          {/* Lane Position Indicator */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 lane-indicator px-4 py-2 rounded-lg text-sm">
            <span className="text-white font-medium">
                Lane {currentLaneIndex + 1} of {currentMultipliers.length}
            </span>
              </div>

          {/* Win Notification Display */}
          {showWinNotification && (
            <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center z-30">
              <div className="text-center">
                <img 
                  src={winNotificationImage} 
                  alt="Win Notification" 
                  className="mx-auto w-64 h-64 animate-bounce" 
                />
                {gameResult && (
                  <div className="text-white text-xl font-bold mt-4 animate-pulse">
                    🎉 You won {gameResult.winAmount} ETB! 🎉
            </div>
                )}
            </div>
          </div>
          )}

          {/* Dead Chicken Display */}
          {crashDelay > 0 && (
            <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-20 crash-effect">
              <div className="text-center">
                <img 
                  src={deadChickenImage} 
                  alt="Dead Chicken" 
                  className="mx-auto mb-4 w-32 h-32 animate-pulse" 
                />
                <div className="text-white text-2xl font-bold animate-bounce">
                  💥 CRASH! 💥
              </div>
              </div>
            </div>
          )}

      {/* Betting Controls - Bottom Panel - Mobile Responsive */}
      <div className="control-panel p-4 md:p-6">
        {/* Mobile Layout - Horizontal Panel */}
        <div className="block md:hidden">
          {!isPlaying && !gameEnded ? (
            /* Pre-game Layout */
            <div className="bg-gray-700 rounded-lg p-4 space-y-4">
              {/* Betting Controls Row */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-1 items-center justify-between gap-2 bg-gray-800 rounded-lg p-2">
                  <button
                    onClick={() => setGameState(prev => ({ ...prev, betAmount: Math.max(1, prev.betAmount - 1) }))}
                    disabled={gameState.betAmount <= 1}
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-white font-bold">-</span>
                  </button>

                  <div className="flex-1 rounded-lg px-4 py-2 text-center min-w-[80px]">
                    <span className="text-white font-bold">{gameState.betAmount.toFixed(2)}</span>
              </div>

                  <button
                    onClick={() => setGameState(prev => ({ ...prev, betAmount: Math.min(1000, prev.betAmount + 1) }))}
                    disabled={gameState.betAmount >= 1000}
                    className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-white font-bold">+</span>
                  </button>
            </div>
                <button className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-500">
                  <span className="text-white">⚙️</span>
                </button>
            </div>

              {/* Difficulty Selection Row */}
              <div className="flex items-center justify-between">
                <select
                  value={gameState.difficulty}
                  onChange={(e) => setGameState(prev => ({ ...prev, difficulty: e.target.value }))}
                  className="bg-gray-800 w-full text-white rounded px-3 py-2"
                >
                  {difficulties && Object.entries(difficulties).map(([key, config]) => (
                    <option key={key} value={key}>{config.name}</option>
                  ))}
                </select>
          </div>

              {/* Play Button */}
              <button
                onClick={startNewGame}
                disabled={!difficulties}
                className="w-full font-bold py-4 rounded-lg game-button text-white disabled:bg-gray-500 disabled:cursor-not-allowed text-xl"
              >
                Play
              </button>
            </div>
          ) : isPlaying && !gameEnded ? (
            /* Playing Layout - Like the Image */
            <div className="bg-gray-700 rounded-lg p-4 space-y-4">
              {/* Top Row - Betting Controls */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-1 items-center justify-between gap-2 bg-gray-800 rounded-lg p-2">
                  <button
                    onClick={() => setGameState(prev => ({ ...prev, betAmount: Math.max(1, prev.betAmount - 1) }))}
                    disabled={gameState.betAmount <= 1}
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-white font-bold">-</span>
                  </button>

                  <div className="flex-1 rounded-lg px-4 py-2 text-center min-w-[80px]">
                    <span className="text-white font-bold">{gameState.betAmount.toFixed(2)}</span>
              </div>

                  <button
                    onClick={() => setGameState(prev => ({ ...prev, betAmount: Math.min(1000, prev.betAmount + 1) }))}
                    disabled={gameState.betAmount >= 1000}
                    className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-white font-bold">+</span>
                  </button>
              </div>
                <button className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-500">
                  <span className="text-white">⚙️</span>
                </button>
            </div>

              {/* Bottom Row - Action Buttons */}
              <div className="flex gap-2 w-full">
                <button
                  onClick={cashOut}
                  className="flex-1 font-bold py-4 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-black transition-colors flex flex-col items-center"
                >
                  <span className="text-lg font-bold">CASH OUT</span>
                  <span className="text-sm font-medium">
                    {calculateWinnings(currentMultipliers[currentLaneIndex] || 1).toFixed(2)} ETB
                  </span>
                </button>
              <button 
                onClick={moveToNextLane}
                  disabled={currentLaneIndex >= currentMultipliers.length - 1}
                  className={`flex-1 font-bold py-4 rounded-lg transition-colors transform hover:scale-105 active:scale-95 ${currentLaneIndex >= currentMultipliers.length - 1
                    ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                  <span className="text-lg font-bold">GO</span>
                </button>
              </div>
            </div>
          ) : (
            /* Game Ended Layout */
            <div className="bg-gray-700 rounded-lg p-4">
              <button
                onClick={resetGame}
                className="w-full font-bold py-4 rounded-lg game-button text-white text-xl"
              >
                New Game
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Layout - Original Design */}
      <div className="hidden md:block">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-6">
          {/* Bet Amount Input with +/- Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setGameState(prev => ({ ...prev, betAmount: Math.max(1, prev.betAmount - 1) }))}
              disabled={isPlaying || gameState.betAmount <= 1}
              className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-white font-bold">-</span>
            </button>

            <div className="bg-gray-800 rounded-lg px-4 py-2 text-center min-w-[80px]">
              <span className="text-white font-bold">{gameState.betAmount.toFixed(2)}</span>
            </div>

            <button
              onClick={() => setGameState(prev => ({ ...prev, betAmount: Math.min(1000, prev.betAmount + 1) }))}
              disabled={isPlaying || gameState.betAmount >= 1000}
              className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-white font-bold">+</span>
            </button>

            {/* Settings Gear Icon */}
            <button className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-500 ml-2">
              <span className="text-white">⚙️</span>
            </button>
          </div>

          {/* Difficulty Selection */}
          <div className="flex-1 flex flex-col items-center">
            <label className="text-white font-medium mb-3">
              Difficulty
            </label>
            <div className="flex gap-2">
              {difficulties && Object.entries(difficulties).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setGameState(prev => ({ ...prev, difficulty: key }))}
                  disabled={isPlaying}
                  className={`px-4 py-2 rounded-lg font-medium difficulty-button ${gameState.difficulty === key ? 'active' : ''
                    } ${isPlaying ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="font-bold text-sm">{config.name}</div>
                </button>
              ))}
            </div>
            <div className="text-xs text-white mt-2">
              Select your risk level
            </div>
          </div>

          {/* Play Button - Right Side */}
          <div className="flex items-center">
            {!isPlaying && !gameEnded ? (
              <button
                onClick={startNewGame}
                disabled={!difficulties}
                className="font-bold py-4 px-12 rounded-lg game-button text-white disabled:bg-gray-500 disabled:cursor-not-allowed text-xl transform transition-transform hover:scale-105 active:scale-95"
              >
                Play
              </button>
            ) : isPlaying && !gameEnded ? (
              <div className="flex gap-3">
                 <button
                   onClick={cashOut}
                   className="font-bold py-3 px-6 rounded-lg cash-out-button text-white transition-colors flex flex-col items-center"
                 >
                  <span className="text-sm">CASH OUT</span>
                  <span className="text-xs font-medium">
                    ${calculateWinnings(currentMultipliers[currentLaneIndex] || 1).toFixed(2)}
                  </span>
                </button>
                <button
                  onClick={moveToNextLane}
                  disabled={currentLaneIndex >= currentMultipliers.length - 1}
                  className={`font-bold py-3 px-6 rounded-lg transition-colors transform hover:scale-105 active:scale-95 ${currentLaneIndex >= currentMultipliers.length - 1
                    ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                >
                  {currentLaneIndex >= currentMultipliers.length - 1 ? 'Max Lane' : 'Next'}
              </button>
              </div>
            ) : (
              <button 
                onClick={resetGame}
                className="font-bold py-4 px-12 rounded-lg game-button text-white text-xl transform transition-transform hover:scale-105 active:scale-95"
              >
                New Game
              </button>
            )}
          </div>
        </div>
        </div>
      </div>



  {/* Menu Overlay */ }
  {
    showMenu && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 bg-opacity-95 rounded-lg p-6 max-w-sm w-full mx-4">
            {/* User Profile Section */}
            <div className="flex items-center gap-3 mb-6">
              {userInfo ? (
                <>
                  <div className="flex-1">
                    <div className="text-white font-medium">@{userInfo.username}</div>
                    <div className="text-gray-400 text-sm flex items-center gap-1">
                      <FaCoins className="text-[#A78BFA] text-xs" />
                      {userInfo.balance || 0} ETB
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
                  onClick={() => setMusicEnabled(!musicEnabled)}
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
              <div className="w-full flex items-center gap-3 text-left p-2 rounded bg-gray-700">
                <div className="w-6 h-6 flex items-center justify-center">
                  <span className="text-lg">📊</span>
                </div>
                <div className="flex-1">
                  <div className="text-white text-sm">RTP: 95.5%</div>
                  <div className="text-gray-400 text-xs">Max Win: $20,000</div>
                </div>
              </div>
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
    )
  }

  {/* How to Play Modal */ }
  {
    showHowToPlay && (
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
      )
    }
    </>
  )
}

export default Chicken