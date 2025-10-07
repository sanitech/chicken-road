import ENV_CONFIG from './envConfig'

export const apiUrl = ENV_CONFIG.apiUrl

// Helper to build headers with tenant ID for multi-bot mode
export const buildHeaders = (token, tenantId = null) => {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
  
  // Add x-tenant-id header for multi-bot mode
  if (ENV_CONFIG.isMultiBot && tenantId) {
    headers['x-tenant-id'] = tenantId
  }
  
  return headers
}