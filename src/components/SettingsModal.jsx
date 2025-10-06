import React, { memo } from 'react'
import Switch from 'react-switch'
import { GAME_CONFIG } from '../utils/gameConfig'

function SettingsModal({ show, onClose, userInfo, musicEnabled, setMusicEnabled, soundEnabled, setSoundEnabled, audioManager }) {
  if (!show) return null
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="w-full max-w-lg mx-4 rounded-2xl shadow-2xl" style={{ backgroundColor: GAME_CONFIG.COLORS.BACKGROUND }}>
        <div className="px-8 pt-8 pb-6 text-center">
          <div className="mx-auto w-20 h-20 rounded-full overflow-hidden ring-2 ring-gray-600 mb-4">
            <img src={`https://i.pravatar.cc/160?u=${userInfo?.username || 'player'}`} alt="avatar" className="w-full h-full object-cover" />
          </div>
          <div className="text-2xl font-semibold" style={{ color: GAME_CONFIG.COLORS.BRIGHT_TEXT }}>{userInfo?.username || 'Player'}</div>
        </div>

        <div className="border-t border-gray-700" />

        <div className="px-6 py-4 space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg transition-colors hover:opacity-80" style={{ backgroundColor: 'transparent' }}>
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
                  audioManager.current.play().catch(() => {})
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
        </div>

        <div className="px-6 pb-6 pt-2 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg hover:opacity-80" style={{ backgroundColor: GAME_CONFIG.COLORS.ELEVATED, color: GAME_CONFIG.COLORS.BRIGHT_TEXT }}>Close</button>
        </div>
      </div>
    </div>
  )
}

export default memo(SettingsModal)


