import { useRef, useEffect, useCallback } from 'react'
import { Howl, Howler } from 'howler'
import backgroundMusic from '../assets/audio/ChickenRoadClient.webm'
import cashoutAudio from '../assets/audio/cashout.a30989e2.mp3'
import crashAudio from '../assets/audio/chick.ffd1f39b.mp3'
import buttonClickAudio from '../assets/audio/buttonClick.mp3'
import jumpAudio from '../assets/audio/jump.mp3'

/**
 * Custom hook for audio management using Howler.js
 * Centralizes all audio operations and state
 */
export const useAudioManager = (soundEnabled = true, musicEnabled = true) => {
  const audioManager = useRef(null)

  // Initialize audio manager
  useEffect(() => {
    if (!audioManager.current) {
      audioManager.current = new GameAudioManager()
      console.log('Initializing Howler.js audio manager...')
    }
  }, [])

  // Update audio settings when they change
  useEffect(() => {
    if (audioManager.current) {
      audioManager.current.setSoundEnabled(soundEnabled)
      audioManager.current.setMusicEnabled(musicEnabled)
    }
  }, [soundEnabled, musicEnabled])

  // Audio control functions
  const playBackgroundMusic = useCallback(() => {
    if (audioManager.current && musicEnabled) {
      audioManager.current.playBackgroundMusic()
    }
  }, [musicEnabled])

  const pauseBackgroundMusic = useCallback(() => {
    if (audioManager.current) {
      audioManager.current.pauseBackgroundMusic()
    }
  }, [])

  const playJumpAudio = useCallback(() => {
    if (audioManager.current && soundEnabled) {
      audioManager.current.playJump()
    }
  }, [soundEnabled])

  const playCrashAudio = useCallback(() => {
    if (audioManager.current && soundEnabled) {
      audioManager.current.playCrash()
    }
  }, [soundEnabled])

  const playCashoutAudio = useCallback(() => {
    if (audioManager.current && soundEnabled) {
      audioManager.current.playCashout()
    }
  }, [soundEnabled])

  const playButtonClickAudio = useCallback(() => {
    if (audioManager.current && soundEnabled) {
      audioManager.current.playButtonClick()
    }
  }, [soundEnabled])

  return {
    audioManager,
    playBackgroundMusic,
    pauseBackgroundMusic,
    playJumpAudio,
    playCrashAudio,
    playCashoutAudio,
    playButtonClickAudio
  }
}

// Game Audio Manager using Howler.js
class GameAudioManager {
  constructor() {
    this.backgroundMusic = new Howl({
      src: [backgroundMusic],
      loop: true,
      volume: 0.3,
      autoplay: false,
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

    this.soundEnabled = true
    this.musicEnabled = true
  }

  // Background music controls
  playBackgroundMusic() {
    if (this.musicEnabled && !this.backgroundMusic.playing()) {
      this.backgroundMusic.play()
    }
  }

  pauseBackgroundMusic() {
    this.backgroundMusic.pause()
  }

  // Sound effects
  playCashout() {
    if (this.soundEnabled) {
      this.cashoutSound.play()
    }
  }

  playCrash() {
    if (this.soundEnabled) {
      this.crashSound.play()
    }
  }

  playButtonClick() {
    if (this.soundEnabled) {
      this.buttonClickSound.play()
    }
  }

  playJump() {
    if (this.soundEnabled) {
      this.jumpSound.play()
    }
  }

  // Settings
  setSoundEnabled(enabled) {
    this.soundEnabled = enabled
    if (!enabled) {
      Howler.stop()
    }
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = enabled
    if (!enabled) {
      this.pauseBackgroundMusic()
    }
  }
}