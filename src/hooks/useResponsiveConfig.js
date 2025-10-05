import { useState, useEffect } from 'react';
import { SCREEN_PRESETS, LARGE_SCREEN_BREAKPOINT_PX, getActiveScreenPreset } from '../utils/gameConfig';

/**
 * Hook that tracks current screen preset (STANDARD or LARGE) and updates when viewport resizes.
 * Consumers can use this to adjust UI elements or trigger reload logic when the breakpoint changes.
 */
export function useResponsiveConfig() {
  const [screenSize, setScreenSize] = useState(() => getActiveScreenPreset());
  const [config, setConfig] = useState(() => SCREEN_PRESETS[screenSize]);

  useEffect(() => {
    const handleResize = () => {
      const nextPreset = getActiveScreenPreset();
      if (nextPreset !== screenSize) {
        console.log(`[useResponsiveConfig] Screen preset changed: ${screenSize} → ${nextPreset} (width=${window.innerWidth}px)`);
        setScreenSize(nextPreset);
        setConfig(SCREEN_PRESETS[nextPreset]);

        // Request a full reload so static layout constants take effect everywhere
        // Delay slightly to allow state updates and debounce cleanup
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.location.reload();
          }
        }, 150);
      }
    };

    // Debounce rapid resize events
    let resizeTimeout;
    const onResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 250);
    };

    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      clearTimeout(resizeTimeout);
    };
  }, [screenSize]);

  return {
    screenSize,
    config,
    breakpoint: LARGE_SCREEN_BREAKPOINT_PX,
    isLargeScreen: screenSize === 'LARGE',
  };
}
