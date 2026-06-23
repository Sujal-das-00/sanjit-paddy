const crypto = require('crypto');
const authModel = require('../models/authModel');
const { AppError } = require('../utils/AppError');

const ITERATIONS = 120000;
const KEY_LENGTH = 64;
const DIGEST = 'sha512';

function normalizeUsername(username) {
  return String(username || '').trim();
}

function normalizePassword(password) {
  return String(password || '').trim();
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(normalizePassword(password), salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
}

function createPasswordSalt() {
  return crypto.randomBytes(8).toString('hex');
}

async function login(username, password) {
  const normalizedUsername = normalizeUsername(username);
  if (!normalizedUsername) {
    throw new AppError('Username is required', 400);
  }

  const user = await authModel.getUserByUsername(normalizedUsername);
  if (!user) {
    throw new AppError('Invalid username or password', 401);
  }

  const hashed = hashPassword(password, user.password_salt);
  if (hashed !== user.password_hash) {
    throw new AppError('Invalid username or password', 401);
  }

  return { id: user.id, username: user.username };
}

async function changePassword(userId, currentPassword, newPassword) {
  const user = await authModel.getUserById(userId);
  if (!user) {
    throw new AppError('Invalid session', 401);
  }

  const currentHash = hashPassword(currentPassword, user.password_salt);
  if (currentHash !== user.password_hash) {
    throw new AppError('Current password is incorrect', 400);
  }

  const passwordSalt = createPasswordSalt();
  const passwordHash = hashPassword(newPassword, passwordSalt);
  await authModel.updatePassword(user.id, passwordHash, passwordSalt);
  return { id: user.id, username: user.username };
}

module.exports = { login, changePassword, hashPassword, createPasswordSalt };
