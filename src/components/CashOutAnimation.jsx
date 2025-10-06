import React, { memo } from 'react'
import winNotificationImage from '../assets/winNotification.aba8bdcf.png'
import { GAME_CONFIG } from '../utils/gameConfig'

function CashOutAnimation({ show, amount }) {
  if (!show) return null
  return (
    <div className="absolute z-30" style={{ top: '20%', left: '50%', transform: 'translate(-50%, -50%)' }}>
      <div className="relative">
        <img src={winNotificationImage} alt="Win Notification" className="w-96 h-40" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="font-black text-lg px-6" style={{ color: GAME_CONFIG.COLORS.BRIGHT_TEXT }}>WIN!</div>
          <div className="font-bold text-2xl drop-shadow-lg mt-7" style={{ color: GAME_CONFIG.COLORS.BRIGHT_TEXT }}>{amount.toFixed(2)} ETB</div>
        </div>
      </div>
    </div>
  )
}

export default memo(CashOutAnimation)


