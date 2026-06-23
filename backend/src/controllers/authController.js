const authService = require('../services/authService');
const { asyncHandler } = require('../utils/asyncHandler');
const { AppError } = require('../utils/AppError');
const { env } = require('../config/env');
const crypto = require('crypto');

function createAuthToken(user) {
  const payload = String(user.id);
  const signature = crypto
    .createHmac('sha256', env.authCookieSecret)
    .update(payload)
    .digest('hex');

  return `${payload}.${signature}`;
}

function setAuthCookie(res, user) {
  res.cookie(env.authCookieName, createAuthToken(user), {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProduction,
    maxAge: env.authCookieMaxAgeMs,
  });
}

function clearAuthCookie(res) {
  res.clearCookie(env.authCookieName);
}

exports.login = asyncHandler(async (req, res) => {
  const { username, password } = req.body || {};
  const user = await authService.login(username, password);
  setAuthCookie(res, user);
  res.json({ user });
});

exports.logout = asyncHandler(async (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

exports.me = asyncHandler(async (req, res) => {
  if (!req.authenticatedUser) {
    throw new AppError('Unauthorized', 401);
  }
  res.json({ user: req.authenticatedUser });
});

exports.changePassword = asyncHandler(async (req, res) => {
  if (!req.authenticatedUser) {
    throw new AppError('Unauthorized', 401);
  }
  const { currentPassword, newPassword } = req.body || {};
  const user = await authService.changePassword(req.authenticatedUser.id, currentPassword, newPassword);
  res.json({ user });
});
