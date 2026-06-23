const { env } = require('../config/env');
const authModel = require('../models/authModel');
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

  const user = await authModel.getUserById(userId);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  req.authenticatedUser = { id: user.id, username: user.username };
  next();
}

module.exports = { authGuard };
