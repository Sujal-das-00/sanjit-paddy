const { env } = require('../config/env');
const authModel = require('../models/authModel');
const { toSessionUser, isActiveUser } = require('../services/authService');
const { ROLES } = require('../config/constants');
const crypto = require('crypto');

function parseAuthenticatedUserId(token) {
  if (!token || typeof token !== 'string') return null;

  const [userId, signature] = token.split('.');
  if (!userId || !signature) return null;

  const expectedSignature = crypto
    .createHmac('sha256', env.authCookieSecret)
    .update(userId)
    .digest('hex');

  const provided = Buffer.from(signature, 'hex');
  const expected = Buffer.from(expectedSignature, 'hex');
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    return null;
  }

  const numericUserId = Number(userId);
  return Number.isInteger(numericUserId) && numericUserId > 0 ? numericUserId : null;
}

async function authGuard(req, res, next) {
  if (req.path === '/auth/login' || req.path === '/health') {
    return next();
  }

  const token = req.cookies?.[env.authCookieName];
  const userId = parseAuthenticatedUserId(token);
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const user = await authModel.getUserById(userId);
    // A deactivated account loses access immediately, even with a valid cookie.
    if (!isActiveUser(user)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    req.authenticatedUser = toSessionUser(user);
    next();
  } catch (error) {
    next(error);
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.authenticatedUser || !roles.includes(req.authenticatedUser.role)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action' });
    }
    next();
  };
}

const requireAdmin = requireRole(ROLES.ADMIN);

module.exports = { authGuard, requireRole, requireAdmin };
