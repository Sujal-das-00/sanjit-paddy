const dotenv = require('dotenv');

dotenv.config();

function parseCorsOrigins(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const env = {
  isProduction: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT || 4000),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
  dbHost: process.env.DB_HOST || 'localhost',
  dbPort: Number(process.env.DB_PORT || 3306),
  dbName: process.env.DB_NAME || 'paddy_management',
  dbUser: process.env.DB_USER || 'root',
  dbPassword: process.env.DB_PASSWORD || '',
  dbConnectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  authCookieName: process.env.AUTH_COOKIE_NAME || 'paddy_auth',
  authCookieMaxAgeMs: Number(process.env.AUTH_COOKIE_MAX_AGE_MS || 1000 * 60 * 60 * 24 * 14),
  authCookieSecret: process.env.AUTH_COOKIE_SECRET || 'change-me-in-production',
  authCookieSameSite: process.env.AUTH_COOKIE_SAME_SITE || 'lax',
  authCookieSecure:
    process.env.AUTH_COOKIE_SECURE === undefined
      ? process.env.NODE_ENV === 'production'
      : process.env.AUTH_COOKIE_SECURE === 'true',
  authCookieDomain: process.env.AUTH_COOKIE_DOMAIN || undefined,
};

module.exports = { env };
