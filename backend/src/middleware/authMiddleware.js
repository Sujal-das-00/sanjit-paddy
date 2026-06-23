const { env } = require('../config/env');
const authModel = require('../models/authModel');

async function authGuard(req, res, next) {
  if (req.path === '/auth/login' || req.path === '/health') {
    return next();
  }

  const token = req.cookies?.[env.authCookieName];
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const user = await authModel.getUserByUsername('admin');
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  req.authenticatedUser = { id: user.id, username: user.username };
  next();
}

module.exports = { authGuard };
