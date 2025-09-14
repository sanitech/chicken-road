import React, { useState, useEffect } from 'react'
import { useGetUserInfo } from '../utils/getUserinfo'
import { FaCoins } from 'react-icons/fa'
import logoImage from '../assets/logo.png'
import deadChickenImage from '../assets/chickendead.png'
import Lane from './Lane'

const INITIAL_MULTIPLIERS = [1.01, 1.03, 1.06, 1.1, 1.15, 1.2, 1.25, 1.3, 1.4, 1.5, 1.6, 1.75, 1.9, 2.0, 2.2, 2.5, 3.0] 
 
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
  const [currentMultipliers, setCurrentMultipliers] = useState(INITIAL_MULTIPLIERS) // Dynamic multipliers array
  
  // Crash control state
  const [crashIndex, setCrashIndex] = useState(5) // Default crash at index 5
  const [gameEnded, setGameEnded] = useState(false) // Track if game has ended due to crash
  const [isDead, setIsDead] = useState(false) // Track if chicken is dead (crashed)
  
  // Range display state
  const [windowSize, setWindowSize] = useState(5) // Number of lanes to show at once
 
  const [showHowToPlay, setShowHowToPlay] = useState(false)
  const [showDifficultyDropdown, setShowDifficultyDropdown] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [musicEnabled, setMusicEnabled] = useState(false)

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


  // Function to move chicken to next lane
  const moveToNextLane = () => {
    // Check if next move would trigger crash
    const nextIndex = currentLaneIndex + 1
    if (nextIndex >= crashIndex) {
      setGameEnded(true)
      setIsDead(true) // Set chicken as dead when it crashes
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


  // Calculate dynamic range based on current chicken position
  const calculateDynamicRange = () => {
    const totalLanes = currentMultipliers.length
    const halfWindow = Math.floor(windowSize / 2)
    
    // Center the window around the current chicken position
    let start = Math.max(0, currentLaneIndex - halfWindow)
    let end = Math.min(totalLanes - 1, start + windowSize - 1)
    
    // Adjust start if we're near the end
    if (end === totalLanes - 1) {
      start = Math.max(0, end - windowSize + 1)
    }
    
    return { start, end }
  }

  // Get multipliers for display within the dynamic range
  const getAllMultipliers = () => {
    const range = calculateDynamicRange()
    return currentMultipliers.slice(range.start, range.end + 1)
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
    <div className="min-h-screen bg-gray-800 text-white">
      {/* Game Header */}
      <header className="bg-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src={logoImage}
            alt="Chicken Road Logo"
            className="h-8 w-auto"
          />
        </div>

        <div className="flex items-center gap-4">
          {userInfo ? (
            <div className="px-4 py-2 rounded flex items-center gap-2">
              <FaCoins className="text-[#A78BFA] text-md" />
              <span className="text-md font-bold">
                {gameState.balance.toLocaleString("en-US", { minimumFractionDigits: 1 })}
              </span>
              <span className="text-sm">ETB</span>  
            </div>
          ) : (
            <div className="bg-gray-700 px-4 py-2 rounded flex items-center gap-2">
              <div className="animate-pulse">
                <div className="h-5 w-20 bg-gray-600 rounded"></div>
              </div>
            </div>
          )}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-8 h-8 bg-gray-600 rounded flex items-center justify-center hover:bg-gray-500"
          >
            <span className="text-sm">☰</span>
          </button>
        </div>
      </header>

      {/* Main Game Container */}
      <div className="max-w-6xl mx-auto ">
        <div className="grid grid-cols-1 lg:grid-cols-3">
          {/* Game Area */}
          <div className="lg:col-span-2">
            <div className="relative bg-gray-600 rounded-lg overflow-hidden">
              {/* Lane component with dynamic range */}
              <Lane
                remainingMultipliers={getAllMultipliers()}
                currentIndex={Math.max(0, currentLaneIndex - calculateDynamicRange().start)}
                displayIndex={Math.max(0, currentLaneIndex - calculateDynamicRange().start)}
                globalCurrentIndex={currentLaneIndex}
                globalDisplayStart={calculateDynamicRange().start}
                isDead={isDead || currentLaneIndex >= crashIndex - 1}
                crashIndex={crashIndex}
                shouldAnimateCar={currentLaneIndex >= crashIndex - 1 && !gameEnded}
                gameEnded={gameEnded}
              />
            </div>
          </div>


       {/* Lane position indicator */}
       <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 px-3 py-1 rounded text-sm">
                Lane {currentLaneIndex + 1} of {currentMultipliers.length}
              </div>

          {/* Crash Index Control */}
          <div className="bg-gray-700 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">
                Crash Index: {crashIndex}
              </label>
              <span className="text-xs text-gray-400">
                Multiplier: {INITIAL_MULTIPLIERS[crashIndex]?.toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min="1"
              max={INITIAL_MULTIPLIERS.length - 1}
              value={crashIndex}
              onChange={(e) => setCrashIndex(parseInt(e.target.value))}
              disabled={gameEnded}
              className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #10B981 0%, #10B981 ${(crashIndex / (INITIAL_MULTIPLIERS.length - 1)) * 100}%, #374151 ${(crashIndex / (INITIAL_MULTIPLIERS.length - 1)) * 100}%, #374151 100%)`
              }}
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1.01x</span>
              <span>{INITIAL_MULTIPLIERS[INITIAL_MULTIPLIERS.length - 1].toFixed(2)}x</span>
            </div>
          </div>

          {/* Game Status */}
          {gameEnded && (
            <div className="bg-red-600 rounded-lg p-4 mb-4 text-center">
              <div className="text-lg font-bold mb-2">💥 CRASH!</div>
              <div className="text-sm">
                Chicken crashed at lane {currentLaneIndex + 1} (Target: {crashIndex + 1})
              </div>
              <div className="text-sm">
                Final Multiplier: {currentMultipliers[currentLaneIndex]?.toFixed(2)}x
              </div>
            </div>
          )}

          {/* Control Buttons */}
          <div className="p-4 flex justify-center gap-4">
            {!gameEnded ? (
              <button 
                onClick={moveToNextLane}
                disabled={currentLaneIndex >= currentMultipliers.length - 1 || currentLaneIndex >= crashIndex - 1}
                className={`font-bold py-3 px-8 rounded-lg transition-colors ${
                  currentLaneIndex >= currentMultipliers.length - 1 || currentLaneIndex >= crashIndex - 1
                    ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {currentLaneIndex >= currentMultipliers.length - 1 ? 'Max Lane' : 
                 currentLaneIndex >= crashIndex - 1 ? 'Will Crash!' : 'Next'}
              </button>
            ) : (
              <button 
                onClick={resetGame}
                className="font-bold py-3 px-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                Reset Game
              </button>
            )}
          </div>

        </div>
      </div>

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