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

// Difficulty configurations from server - synchronized with backend
const DIFFICULTY_CONFIGS = {
  easy: {
    name: "Easy Mode",
    lanes: 30,
    startingMultiplier: 1.01,
    maxMultiplier: 100,
    houseEdge: 4.5, // 95.5% RTP
    rtp: 95.5,
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
    houseEdge: 4.5, // 95.5% RTP
    rtp: 95.5,
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
    houseEdge: 4.5, // 95.5% RTP
    rtp: 95.5,
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
    houseEdge: 4.5, // 95.5% RTP
    rtp: 95.5,
    multipliers: [
      1.44, 1.55, 1.68, 1.82, 1.98, 2.15, 2.35, 2.58, 2.84, 3.15,
      3.50, 3.90, 4.35, 4.85, 5.40, 6.00, 6.70, 7.50
    ]
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
  
  // Jump physics state - removed animations for instant movement

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

      const creatorChatId = userInfo?.chatId;

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

      // Sync with backend initial state - don't force automatic jump
      setCurrentLaneIndex(result.currentLane || 0)
      setMovedLanes([0, result.currentLane || 0])
      
      // Play chicken sound to indicate game started
      audioManager.playChickenSound()

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

      // Move chicken to next lane instantly (no animation)
      setCurrentLaneIndex(nextIndex)
      setMovedLanes(prevLanes => [...prevLanes, nextIndex])
      
      // Play chicken sound for successful move
      audioManager.playChickenSound()
    } catch (e) {
      console.error('Move failed:', e)
    }
  }

  // Animation functions removed - using instant movement instead

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
      <header className="game-header px-2 py-4 flex items-center justify-between" style={{ backgroundColor: '#1A1A1A' }}>
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
                isJumping={false}
                jumpProgress={0}
                jumpStartLane={0}
                jumpTargetLane={0}
              />
            </div>
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
                <div className="flex flex-1 items-center justify-between gap-2 rounded-lg p-2" style={{ backgroundColor: '#2A2A2A' }}>
                  <button
                    onClick={() => setGameState(prev => ({ ...prev, betAmount: Math.max(1, prev.betAmount - 1) }))}
                    disabled={gameState.betAmount <= 1}
                    className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#333333' }}
                    onMouseEnter={(e) => !e.target.disabled && (e.target.style.backgroundColor = '#444444')}
                    onMouseLeave={(e) => !e.target.disabled && (e.target.style.backgroundColor = '#333333')}
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
                    style={{ backgroundColor: '#333333' }}
                    onMouseEnter={(e) => !e.target.disabled && (e.target.style.backgroundColor = '#444444')}
                    onMouseLeave={(e) => !e.target.disabled && (e.target.style.backgroundColor = '#333333')}
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
                  className="flex-1 font-bold py-4 rounded-lg text-white transition-colors flex flex-col items-center"
                  style={{ backgroundColor: '#4CAF50' }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#45A049'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#4CAF50'}
                >
                  <span className="text-lg font-bold">CASH OUT</span>
                  <span className="text-sm font-medium">
                    {calculateWinnings(currentMultipliers[Math.max(0, currentLaneIndex - 1)] || 1).toFixed(2)} ETB
                  </span>
                </button>
              <button 
                onClick={moveToNextLane}
                  disabled={currentLaneIndex >= currentMultipliers.length - 1}
                  className={`flex-1 font-bold py-4 rounded-lg transition-colors transform hover:scale-105 active:scale-95 text-white ${currentLaneIndex >= currentMultipliers.length - 1
                    ? 'cursor-not-allowed opacity-50'
                    : ''
                }`}
                  style={{ 
                    backgroundColor: currentLaneIndex >= currentMultipliers.length - 1 ? '#666666' : '#333333'
                  }}
                  onMouseEnter={(e) => {
                    if (currentLaneIndex < currentMultipliers.length - 1) {
                      e.target.style.backgroundColor = '#444444'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentLaneIndex < currentMultipliers.length - 1) {
                      e.target.style.backgroundColor = '#333333'
                    }
                  }}
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