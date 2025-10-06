import React, { memo } from 'react'
import { Link } from 'react-router-dom'
import { GAME_CONFIG } from '../utils/gameConfig'
import { FaCoins } from 'react-icons/fa'

function MobileMenu({ show, onClose, userInfo, soundEnabled, setSoundEnabled, musicEnabled, setMusicEnabled, audioManager }) {
  if (!show) return null
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-end sm:items-center justify-center z-50">
      <div className="rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-sm sm:mx-4 max-h-[80vh] overflow-y-auto" style={{ backgroundColor: GAME_CONFIG.COLORS.MORE_ELEVATED }}>
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
              className={`w-12 h-6 rounded-full transition-colors ${soundEnabled ? 'bg-green-500' : 'bg-gray-600'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${soundEnabled ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
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
                if (!musicEnabled && audioManager.current) {
                  audioManager.current.play().catch(() => {})
                } else if (musicEnabled && audioManager.current) {
                  audioManager.current.pause()
                }
              }}
              className={`w-12 h-6 rounded-full transition-colors ${musicEnabled ? 'bg-green-500' : 'bg-gray-600'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${musicEnabled ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
            </button>
          </div>
        </div>

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

          <button onClick={onClose} className="w-full flex items-center gap-3 text-left hover:opacity-80 p-2 rounded" style={{ backgroundColor: 'transparent' }}>
            <div className="w-6 h-6 flex items-center justify-center">
              <span className="text-lg">ℹ️</span>
            </div>
            <span style={{ color: GAME_CONFIG.COLORS.BRIGHT_TEXT }}>How to play?</span>
          </button>

          <Link to="/preview" className="w-full flex items-center gap-3 text-left hover:opacity-80 p-2 rounded" onClick={onClose} style={{ backgroundColor: 'transparent' }}>
            <div className="w-6 h-6 flex items-center justify-center">
              <span className="text-lg">🐔</span>
            </div>
            <span style={{ color: GAME_CONFIG.COLORS.BRIGHT_TEXT }}>Chicken Animation Preview</span>
          </Link>
        </div>

        <div className="text-center">
          <div className="text-sm mb-2" style={{ color: GAME_CONFIG.COLORS.SECONDARY_TEXT }}>Powered by</div>
          <div className="flex items-center justify-center gap-1">
            <span className="font-bold text-lg" style={{ color: GAME_CONFIG.COLORS.CASHOUT_BUTTON }}>IN</span>
            <span className="font-bold text-lg" style={{ color: GAME_CONFIG.COLORS.BRIGHT_TEXT }}>OUT</span>
            <span className="text-lg" style={{ color: GAME_CONFIG.COLORS.CASHOUT_BUTTON }}>→</span>
          </div>
        </div>

        <button onClick={onClose} className="absolute top-4 right-4 hover:opacity-80" style={{ color: GAME_CONFIG.COLORS.SECONDARY_TEXT }}>
          ✕
        </button>
      </div>
    </div>
  )
}

export default memo(MobileMenu)


