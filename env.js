window.APP_CONFIG = window.APP_CONFIG || {};

// Set to true to hit your local backend instead of production.
const USE_LOCAL_BACKEND = true;

// Call the backend directly. Do NOT proxy through Vercel rewrites — Vercel's
// edge intermittently rejects proxied POST bodies with 415 Unsupported Media Type.
window.APP_CONFIG.API_BASE_URL = USE_LOCAL_BACKEND
  ? "http://localhost:4000/api"
  : "https://api.toolszila.com/api";
