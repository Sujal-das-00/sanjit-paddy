const authService = require('../services/authService');
const { asyncHandler } = require('../utils/asyncHandler');
const { AppError } = require('../utils/AppError');
const { env } = require('../config/env');

function setAuthCookie(res) {
  res.cookie(env.authCookieName, '1', {
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
  const { password } = req.body || {};
  const user = await authService.login('admin', password);
  setAuthCookie(res);
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
