// Audio utility for game sound effects
import car1Audio from '../assets/audio/car1.798a7e74.mp3'
import car2Audio from '../assets/audio/car2.903be932.mp3'
import cashoutAudio from '../assets/audio/cashout.a30989e2.mp3'
import chickAudio from '../assets/audio/chick.ffd1f39b.mp3'
import crashAudio from '../assets/audio/crash.6d250f25.mp3'
import loseAudio from '../assets/audio/lose.450450c0.mp3'
import winAudio from '../assets/audio/win.01dc43cd.mp3'

class AudioManager {
  constructor() {
    this.sounds = {
      car1: new Audio(car1Audio),
      car2: new Audio(car2Audio),
      cashout: new Audio(cashoutAudio),
      chick: new Audio(chickAudio),
      crash: new Audio(crashAudio),
      lose: new Audio(loseAudio),
      win: new Audio(winAudio)
    }
    
    // Set default volume for all sounds
    Object.values(this.sounds).forEach(sound => {
      sound.volume = 0.5 // 50% volume
      sound.preload = 'auto'
    })
  }

  // Play a sound effect
  play(soundName, volume = 0.5) {
    const sound = this.sounds[soundName]
    if (sound) {
      sound.currentTime = 0 // Reset to beginning
      sound.volume = volume
      sound.play().catch(error => {
        console.log('Audio play failed:', error)
      })
    }
  }

  // Play random car sound
  playCarSound() {
    const carSounds = ['car1', 'car2']
    const randomSound = carSounds[Math.floor(Math.random() * carSounds.length)]
    this.play(randomSound, 0.3) // Lower volume for car sounds
  }

  // Play braking sound effect
  playBrakeSound() {
    // Use car2 sound with lower volume for braking effect
    this.play('car2', 0.2) // Very low volume for subtle braking sound
  }

  // Play cash out sound
  playCashOutSound() {
    this.play('cashout', 0.7)
  }

  // Play chicken sound (jump, movement)
  playChickenSound() {
    this.play('chick', 0.4)
  }

  // Play crash sound
  playCrashSound() {
    this.play('crash', 0.8)
  }

  // Play win sound
  playWinSound() {
    this.play('win', 0.7)
  }

  // Play lose sound
  playLoseSound() {
    this.play('lose', 0.6)
  }

  // Set master volume
  setVolume(volume) {
    Object.values(this.sounds).forEach(sound => {
      sound.volume = volume
    })
  }
}

// Create a singleton instance
const audioManager = new AudioManager()

export default audioManager
