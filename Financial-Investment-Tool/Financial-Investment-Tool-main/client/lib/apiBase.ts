export const API_BASE =
  (process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8080').replace(/\/+$/,'')
export const METRICS_BASE = `${API_BASE}/api/metrics`