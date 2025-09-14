import React, { useState, useEffect } from 'react'
import { useGetUserInfo } from '../utils/getUserinfo'
import { gameApi, generateClientSeed } from '../utils/gameApi'
import { FaCoins } from 'react-icons/fa'
import logoImage from '../assets/logo.png'
import deadChickenImage from '../assets/chickendead.png'
import Lane from './Lane'
import RoadDisplay from './RoadDisplay'

// Difficulty configurations from server - no API requests needed
const DIFFICULTY_CONFIGS = {
  easy: {
    name: "Easy Mode",
    lanes: 30,
    startingMultiplier: 1.01,
    maxMultiplier: 100,
    houseEdge: 28.01,
    multipliers: [1.01, 1.03, 1.06, 1.1, 1.15, 1.2, 1.25, 1.3, 1.4, 1.5, 1.6, 1.75, 1.9, 2.0, 2.2, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 6.0, 7.0, 8.0, 10.0, 12.0, 15.0, 20.0, 25.0, 100.0]
  },
  medium: {
    name: "Medium Mode", 
    lanes: 25,
    startingMultiplier: 1.08,
    maxMultiplier: 500,
    houseEdge: 52.88,
    multipliers: [1.08, 1.15, 1.25, 1.35, 1.45, 1.55, 1.65, 1.75, 1.85, 1.95, 2.05, 2.15, 2.25, 2.35, 2.45, 2.55, 2.65, 2.75, 2.85, 3.0, 3.2, 3.4, 3.6, 4.0, 500.0]
  },
  hard: {
    name: "Hard Mode",
    lanes: 22, 
    startingMultiplier: 1.18,
    maxMultiplier: 1000,
    houseEdge: 69.24,
    multipliers: [1.18, 1.25, 1.35, 1.45, 1.55, 1.65, 1.75, 1.85, 1.95, 2.05, 2.15, 2.25, 2.35, 2.45, 2.55, 2.65, 2.75, 2.85, 3.0, 3.2, 3.4, 1000.0]
  },
  extreme: {
    name: "Extreme Mode",
    lanes: 18,
    startingMultiplier: 1.44, 
    maxMultiplier: 3608855,
    houseEdge: 83.01,
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
  
  // Crash control state
  const [crashIndex, setCrashIndex] = useState(5) // Default crash at index 5
  const [gameEnded, setGameEnded] = useState(false) // Track if game has ended due to crash
  const [isDead, setIsDead] = useState(false) // Track if chicken is dead (crashed)
  
  // Range display state
  const [windowSize, setWindowSize] = useState(7) // Number of lanes to show at once
 
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

      const result = await gameApi.playGame(
        gameState.difficulty,
        gameState.betAmount,
        userInfo?.id || 'guest'
      )

      setCurrentGame(result)
      setGameResult(result)
      
      // Update multipliers based on difficulty (using local config)
      const config = DIFFICULTY_CONFIGS[gameState.difficulty]
      if (config) {
        setCurrentMultipliers(config.multipliers)
        setCrashIndex(result.fallStep + 1) // Set crash point from server
      }

      console.log('Game started:', result)
    } catch (error) {
      console.error('Failed to start game:', error)
      setIsPlaying(false)
    }
  }

  // Calculate dynamic range based on current chicken position
  const calculateDynamicRange = () => {
    const totalLanes = currentMultipliers.length
    const halfWindow = Math.floor(windowSize / 2) // 3 lanes on each side
    
    // For the first few lanes, show from the beginning
    if (currentLaneIndex <= halfWindow) {
      return { start: 0, end: Math.min(windowSize - 1, totalLanes - 1) }
    }
    
    // For lanes near the end, show the last 7 lanes
    if (currentLaneIndex >= totalLanes - halfWindow - 1) {
      return { start: Math.max(0, totalLanes - windowSize), end: totalLanes - 1 }
    }
    
    // Center the window around the current chicken position
    const start = currentLaneIndex - halfWindow
    const end = start + windowSize - 1
    
    return { start, end }
  }

  // Get multipliers for display within the dynamic range
  const getAllMultipliers = () => {
    const range = calculateDynamicRange()
    return currentMultipliers.slice(range.start, range.end + 1)
  }

  // Function to move chicken to next lane
  const moveToNextLane = () => {
    if (!currentGame || gameEnded) return

    // Check if next move would trigger crash (hidden from user)
    const nextIndex = currentLaneIndex + 1
    if (nextIndex >= crashIndex) {
      setGameEnded(true)
      setIsDead(true) // Set chicken as dead when it crashes
      setIsPlaying(false)
      console.log(`Chicken crashed at index ${nextIndex}! Target was ${crashIndex}`)
      return
    }

    setCurrentLaneIndex(prev => {
      const nextIndex = prev + 1
      // Prevent going beyond the last lane
      if (nextIndex < currentMultipliers.length) {
        return nextIndex
      }
      return prev
    })
    
    // Update moved lanes separately to avoid race conditions
    setMovedLanes(prevLanes => {
      const nextIndex = currentLaneIndex + 1
      if (nextIndex < currentMultipliers.length) {
        const newLanes = [...prevLanes, nextIndex]
        console.log('Chicken moved through lanes:', newLanes)
        return newLanes
      }
      return prevLanes
    })

    // Remove first multiplier when reaching lane 2 (index 2)
    if (currentLaneIndex === 1) { // When moving from lane 1 to lane 2
      setCurrentMultipliers(prev => {
        const newMultipliers = prev.slice(1) // Remove first element
        console.log('Removed first multiplier, new array:', newMultipliers)
        return newMultipliers
      })
    }
  }

  // Cash out function
  const cashOut = () => {
    if (!currentGame || gameEnded || !isPlaying) return
    
    const currentMultiplier = currentMultipliers[currentLaneIndex]
    const winAmount = gameState.betAmount * currentMultiplier
    
    console.log(`Cashed out at ${currentMultiplier}x for ${winAmount}`)
    setIsPlaying(false)
    setGameEnded(true)
    // Update balance here
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
    <div className="h-screen bg-gray-800 text-white flex flex-col">
      {/* Header - Matching Image Design */}
      <header className="bg-black px-6 py-4 flex items-center justify-between">
        {/* Left side - Logo and Game Title */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-white font-bold text-lg">H</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">CHICKEN ROAD</span>
            <span className="text-2xl font-bold text-red-500">🐔</span>
            <span className="text-2xl font-bold">2</span>
          </div>
        </div>
        
        {/* Right side - Balance and Controls */}
        <div className="flex items-center gap-4">
          {/* Wallet Icon with Balance */}
          <div className="flex items-center gap-2 bg-yellow-500 px-3 py-1 rounded">
            <span className="text-black font-bold">💰</span>
            <span className="text-black font-bold">{userInfo?.balance || 42}</span>
          </div>
          
          {/* Deposit Button */}
          <button className="bg-yellow-500 text-black px-4 py-2 rounded font-bold hover:bg-yellow-400 transition-colors">
            Deposit
          </button>
          
          {/* Gift Box Icon */}
          <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center">
            <span className="text-white">🎁</span>
          </div>
          
          {/* Balance Display */}
          <div className="flex items-center gap-2">
            <span className="font-medium">{userInfo?.balance || 42}.00 ETB</span>
          </div>
          
          {/* Menu and Chat Icons */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-8 h-8 bg-gray-600 rounded flex items-center justify-center hover:bg-gray-500"
          >
            <span className="text-sm">☰</span>
          </button>
          <button className="w-8 h-8 bg-gray-600 rounded flex items-center justify-center hover:bg-gray-500">
            <span className="text-sm">💬</span>
          </button>
        </div>
      </header>

      {/* Main Game Area - Full Width */}
      <div className="flex-1 flex flex-col">
        {/* Game Area - Lane Display */}
        <div className="flex-1 relative bg-gray-900 min-h-0">
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
          />
        </div>
      </div>

      {/* Betting Controls - Bottom Panel - Matching Image Design */}
      <div className="bg-gray-700 p-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-6">
          {/* Bet Amount Input with +/- Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setGameState(prev => ({...prev, betAmount: Math.max(1, prev.betAmount - 1)}))}
              disabled={isPlaying || gameState.betAmount <= 1}
              className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-white font-bold">-</span>
            </button>
            
            <div className="bg-gray-800 rounded-lg px-4 py-2 text-center min-w-[80px]">
              <span className="text-white font-bold">{gameState.betAmount.toFixed(2)}</span>
            </div>
            
            <button
              onClick={() => setGameState(prev => ({...prev, betAmount: Math.min(1000, prev.betAmount + 1)}))}
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
                  onClick={() => setGameState(prev => ({...prev, difficulty: key}))}
                  disabled={isPlaying}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    gameState.difficulty === key 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-600 text-white hover:bg-gray-500'
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
                className="font-bold py-4 px-12 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed text-xl"
              >
                Play
              </button>
            ) : isPlaying && !gameEnded ? (
              <div className="flex gap-3">
                <button 
                  onClick={cashOut}
                  className="font-bold py-3 px-6 rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white transition-colors"
                >
                  Cash Out
                </button>
                <button 
                  onClick={moveToNextLane}
                  disabled={currentLaneIndex >= currentMultipliers.length - 1}
                  className={`font-bold py-3 px-6 rounded-lg transition-colors ${
                    currentLaneIndex >= currentMultipliers.length - 1
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
                className="font-bold py-4 px-12 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors text-xl"
              >
                Play
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Game Status Overlay */}
      {gameEnded && gameResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-red-600 rounded-lg p-6 text-center max-w-md mx-4">
            <div className="text-2xl font-bold mb-3">💥 CRASH!</div>
            <div className="text-lg mb-2">
              Chicken crashed at lane {gameResult.fallStep + 1}
            </div>
            <div className="text-lg mb-2">
              Final Multiplier: {gameResult.crashMultiplier?.toFixed(2)}x
            </div>
            <div className="text-sm mb-4 opacity-75">
              House Edge: {gameResult.houseEdge?.toFixed(1)}% | RTP: {gameResult.rtp}%
            </div>
            <button 
              onClick={resetGame}
              className="bg-white text-red-600 px-6 py-2 rounded font-bold hover:bg-gray-100"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Game Result Info - Bottom Right */}
      {gameResult && !gameEnded && (
        <div className="fixed bottom-20 right-4 bg-gray-800 rounded-lg p-3 max-w-xs z-40">
          <div className="text-sm font-medium text-gray-300 mb-2">🔐 Provably Fair</div>
          <div className="text-xs text-gray-400 space-y-1">
            <div>Client Seed: {gameResult.clientSeed?.substring(0, 12)}...</div>
            <div>Nonce: {gameResult.nonce}</div>
            <div>Hash: {gameResult.hash?.substring(0, 12)}...</div>
            <div>Difficulty: {gameResult.difficulty}</div>
          </div>
        </div>
      )}

      {/* Menu Overlay */}
      {showMenu && (
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