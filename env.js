window.APP_CONFIG = window.APP_CONFIG || {};

// Set to true to hit your local backend instead of production.
const USE_LOCAL_BACKEND = false;

window.APP_CONFIG.API_BASE_URL = USE_LOCAL_BACKEND
  ? "http://localhost:4000/api"
  : "https://api.toolszila.com/api";
