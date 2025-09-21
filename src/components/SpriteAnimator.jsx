import React, { useEffect, useMemo, useRef, useState } from 'react'

// Renders only one column (columnIndex) of the sprite sheet and animates through its rows
export default function SpriteAnimator({
  imageUrl,
  columns,
  rows,
  columnIndex = 1, // default to the second column
  fps = 10,
  loop = true,
  pixelated = true,
  // If your sprite sheet contains padding on the right/bottom, provide the ACTIVE content size
  // (i.e., width/height that cover only the columns/rows area). If omitted, the component will
  // use the image's natural size which may be incorrect when padding exists.
  contentWidth,
  contentHeight,
  // Optional explicit frame size overrides (useful when fractional sizes cause seams)
  frameWidthOverride,
  frameHeightOverride,
  // Optional top-left offset into the sheet where the active content begins
  offsetX = 0,
  offsetY = 0,
  // Optional constant gutter spacing between frames (in pixels) within the active area
  gutterX = 0,
  gutterY = 0,
  // Visual scale to render the frame box (does not change sampling area)
  scale = 1,
  // Snap background positions to reduce subpixel artifacts: 'none' | 'half' | 'int'
  snap = 'none',
  // Per-row vertical adjustments to stabilize baseline (array of length `rows`)
  perRowYOffset,
  // Per-frame duration controls
  // If provided, this takes precedence over fps for that frame.
  frameDurations,
  // Convenience: hold a specific frame for a given duration (ms)
  holdFrameIndex,
  holdDurationMs,
  // Pause after completing a number of full loops
  restEveryLoops,
  restDurationMs,
  // Only animate the first N rows (top to bottom). Must be <= rows. Defaults to rows
  animateRowCount,
  // Which frame to display during rest: 'last' (at wrap) or 'first'
  restAt = 'last',
}) {
  const [naturalSize, setNaturalSize] = useState(null)
  const [frame, setFrame] = useState(0)
  const frameRef = useRef(0)

  // Load natural dimensions of the sprite sheet
  useEffect(() => {
    const img = new Image()
    img.src = imageUrl
    const handleLoad = () => setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight })
    if (img.complete) handleLoad()
    else img.addEventListener('load', handleLoad)
    return () => img.removeEventListener('load', handleLoad)
  }, [imageUrl])

  // Frame timing
  const rafRef = useRef(null)
  const lastTimeRef = useRef(null)
  const accRef = useRef(0)
  const defaultInterval = 1000 / fps
  const loopsRef = useRef(0)
  const restUntilRef = useRef(null)

  useEffect(() => {
    let stopped = false

    const tick = (time) => {
      if (stopped) return
      if (lastTimeRef.current == null) lastTimeRef.current = time
      const elapsed = time - lastTimeRef.current
      lastTimeRef.current = time
      accRef.current += elapsed

      // If we are in a rest period, do not advance frames until the rest expires
      if (restUntilRef.current && time < restUntilRef.current) {
        rafRef.current = requestAnimationFrame(tick)
        return
      } else if (restUntilRef.current && time >= restUntilRef.current) {
        // Rest finished
        restUntilRef.current = null
      }

      // Determine the interval for the CURRENT frame
      let currentFrame = frameRef.current
      let interval = defaultInterval
      if (Array.isArray(frameDurations) && frameDurations[currentFrame] != null) {
        interval = frameDurations[currentFrame]
      } else if (
        holdFrameIndex != null &&
        currentFrame === holdFrameIndex &&
        typeof holdDurationMs === 'number'
      ) {
        interval = holdDurationMs
      }

      // Advance when we've accumulated enough time
      while (accRef.current >= interval) {
        accRef.current -= interval
        // Determine the next frame based on the current local frame value
        const totalFrames = Math.max(1, Math.min(rows, animateRowCount ?? rows))
        const wrapped = (currentFrame + 1) >= totalFrames
        const newFrame = wrapped ? (loop ? 0 : currentFrame) : currentFrame + 1

        // If we wrapped to frame 0 and looping, increment loop counter
        if (wrapped && loop) {
          loopsRef.current += 1
        }

        // Apply a rest after every N completed loops at the WRAP boundary.
        // IMPORTANT: Keep showing the LAST frame during the rest (do NOT advance to frame 0 yet).
        if (wrapped && loop && restEveryLoops && restDurationMs) {
          if (loopsRef.current % restEveryLoops === 0) {
            // Start a rest period now
            restUntilRef.current = time + restDurationMs
            accRef.current = 0
            if (restAt === 'first') {
              // Commit to frame 0 so we display first frame during the rest
              currentFrame = 0
              frameRef.current = 0
              setFrame(0)
            } else {
              // Keep showing the last frame (do not advance)
            }
            break
          }
        }

        // Commit the frame state change synchronously using refs
        currentFrame = newFrame
        frameRef.current = newFrame
        setFrame(newFrame)

        // After advancing, update interval for the new frame before possibly looping again
        if (Array.isArray(frameDurations) && frameDurations[newFrame] != null) {
          interval = frameDurations[newFrame]
        } else if (
          holdFrameIndex != null &&
          newFrame === holdFrameIndex &&
          typeof holdDurationMs === 'number'
        ) {
          interval = holdDurationMs
        } else {
          interval = defaultInterval
        }

        // (Rest was handled above before committing the frame when needed)
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      stopped = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      lastTimeRef.current = null
      accRef.current = 0
      restUntilRef.current = null
    }
  }, [rows, defaultInterval, loop, frameDurations, holdFrameIndex, holdDurationMs, restEveryLoops, restDurationMs, animateRowCount, restAt])

  // Determine the active content area size (excluding any right/bottom padding)
  const activeSize = useMemo(() => {
    if (contentWidth && contentHeight) return { width: contentWidth, height: contentHeight }
    if (naturalSize) return { width: naturalSize.width, height: naturalSize.height }
    return { width: 0, height: 0 }
  }, [contentWidth, contentHeight, naturalSize])

  const { frameWidth, frameHeight } = useMemo(() => {
    if (frameWidthOverride && frameHeightOverride) {
      return { frameWidth: frameWidthOverride, frameHeight: frameHeightOverride }
    }
    if (!activeSize.width || !activeSize.height) return { frameWidth: 0, frameHeight: 0 }
    return {
      frameWidth: activeSize.width / columns,
      frameHeight: activeSize.height / rows,
    }
  }, [activeSize, columns, rows, frameWidthOverride, frameHeightOverride])

  if (frameWidth === 0 || frameHeight === 0) {
    return null
  }

  // Compute background position so only the selected column is visible, and we step vertically.
  // Include optional offset and gutter. Apply per-row Y adjustments if provided.
  const rawX = -(offsetX + columnIndex * (frameWidth + gutterX))
  const baseY = offsetY + frame * (frameHeight + gutterY)
  const adjustY = Array.isArray(perRowYOffset) && perRowYOffset[frame] ? perRowYOffset[frame] : 0
  const rawY = -(baseY + adjustY)

  const snapValue = (v) => {
    if (snap === 'int') return Math.round(v)
    if (snap === 'half') return Math.round(v * 2) / 2
    return v
  }

  const backgroundPositionX = snapValue(rawX)
  const backgroundPositionY = snapValue(rawY)

  const style = {
    width: frameWidth * scale,
    height: frameHeight * scale,
    backgroundImage: `url(${imageUrl})`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: `${backgroundPositionX}px ${backgroundPositionY}px`,
    // Keep the background at the image's NATURAL size (no scaling), otherwise frames won't line up
    backgroundSize: naturalSize ? `${naturalSize.width}px ${naturalSize.height}px` : undefined,
    imageRendering: pixelated ? 'pixelated' : undefined,
    // Prevent subpixel layout shifts in some browsers
    transform: 'translateZ(0)'
  }

  return <div style={style} />
}
