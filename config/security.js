const DEFAULT_CORS_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://front-end-r0ap.onrender.com',
  'https://www.hokoainalytics.com',
  'https://hokoainalytics.com',
  'https://www.hokoainalytics.com.br',
  'https://hokoainalytics.com.br'
];

const DEFAULT_CROSS_SITE_COOKIE_ORIGINS = [
  'https://front-end-r0ap.onrender.com'
];

function parseOriginsEnv(raw, fallback = []) {
  const normalized = (raw || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  return normalized.length > 0 ? normalized : fallback;
}

function getCorsAllowedOrigins() {
  return parseOriginsEnv(
    process.env.CORS_ALLOWED_ORIGINS,
    DEFAULT_CORS_ALLOWED_ORIGINS
  );
}

function getCrossSiteCookieOrigins() {
  return parseOriginsEnv(
    process.env.CROSS_SITE_COOKIE_ORIGINS,
    DEFAULT_CROSS_SITE_COOKIE_ORIGINS
  );
}

function getCookieSameSite(req) {
  const origin = req?.headers?.origin;
  if (!origin) return 'lax';
  return getCrossSiteCookieOrigins().includes(origin) ? 'none' : 'lax';
}

function getJwtCookieOptions(req) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: getCookieSameSite(req),
    maxAge: 3600000
  };
}

function getJwtClearCookieOptions(req) {
  const options = getJwtCookieOptions(req);
  return {
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite
  };
}

module.exports = {
  getCorsAllowedOrigins,
  getCrossSiteCookieOrigins,
  getCookieSameSite,
  getJwtCookieOptions,
  getJwtClearCookieOptions
};
