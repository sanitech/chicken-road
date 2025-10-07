// Environment configuration for single vs multi-bot deployments
export const ENV_CONFIG = {
  // Deployment mode: 'single' or 'multibot'
  mode: import.meta.env.VITE_GAME_MODE || 'single',
  
  // API URL (different per deployment)
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  
  // Helper flags
  isMultiBot: import.meta.env.VITE_GAME_MODE === 'multibot',
  isSinglePlayer: import.meta.env.VITE_GAME_MODE === 'single'
}

export default ENV_CONFIG

