window.APP_CONFIG = window.APP_CONFIG || {};

// Set to true to hit your local backend instead of production.
const USE_LOCAL_BACKEND = false;

// Call the backend directly. Do NOT proxy through Vercel rewrites — Vercel's
// edge intermittently rejects proxied POST bodies with 415 Unsupported Media Type.
// Use the page's own hostname so localhost / 127.0.0.1 stay the same site and
// the login cookie is sent with every request.
window.APP_CONFIG.API_BASE_URL = USE_LOCAL_BACKEND
  ? `http://${window.location.hostname}:4000/api`
  : "https://api.toolszila.com/api";
