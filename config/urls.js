function normalizeUrl(raw) {
  return String(raw || '').replace(/\/$/, '');
}

const FRONTEND_BASE_URL = normalizeUrl(
  process.env.FRONTEND_BASE_URL || 'https://www.hokoainalytics.com'
);

const API_PUBLIC_BASE_URL = normalizeUrl(
  process.env.API_PUBLIC_BASE_URL || 'https://api-gateway-ye0f.onrender.com'
);

module.exports = {
  FRONTEND_BASE_URL,
  API_PUBLIC_BASE_URL
};
