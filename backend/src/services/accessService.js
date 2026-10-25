const accessModel = require('../models/accessModel');
const { hashPassword, createPasswordSalt } = require('./authService');
const { AppError } = require('../utils/AppError');
const { ROLES, ACCESS_SETTING_KEYS } = require('../config/constants');

const ADMIN_VIEWS = ['dashboard', 'godown-entry', 'home-entry', 'selling', 'reports', 'payments', 'settings'];
const STAFF_VIEWS = ['godown-entry', 'reports', 'settings'];
const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,60}$/;
const MIN_PASSWORD_LENGTH = 4;

function isAdmin(user) {
  return user?.role === ROLES.ADMIN;
}

function toPublicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name || '',
    role: row.role || ROLES.STAFF,
    isActive: Boolean(Number(row.is_active ?? 1)),
    entryCount: row.entry_count !== undefined ? Number(row.entry_count) : undefined,
    createdAt: row.created_at,
  };
}

async function getAccessSettings() {
  const staffCanEdit = await accessModel.getSetting(ACCESS_SETTING_KEYS.STAFF_CAN_EDIT);
  return { staffCanEdit: staffCanEdit === '1' };
}

async function updateAccessSettings(payload = {}) {
  if (payload.staffCanEdit !== undefined) {
    await accessModel.setSetting(ACCESS_SETTING_KEYS.STAFF_CAN_EDIT, payload.staffCanEdit ? '1' : '0');
  }
  return getAccessSettings();
}

// Single source of truth for what a user may do; the frontend only uses this
// to shape the UI, every rule is enforced again on the API routes.
async function getPermissions(user) {
  const settings = await getAccessSettings();
  if (isAdmin(user)) {
    return {
      role: ROLES.ADMIN,
      views: ADMIN_VIEWS,
      canEditEntries: true,
      canDeleteEntries: true,
      canManageUsers: true,
      ownEntriesOnly: false,
      staffCanEdit: settings.staffCanEdit,
    };
  }

  return {
    role: ROLES.STAFF,
    views: STAFF_VIEWS,
    canEditEntries: settings.staffCanEdit,
    canDeleteEntries: false,
    canManageUsers: false,
    ownEntriesOnly: true,
    staffCanEdit: settings.staffCanEdit,
  };
}

function normalizeRole(role) {
  return role === ROLES.ADMIN ? ROLES.ADMIN : ROLES.STAFF;
}

function validatePassword(password) {
  if (String(password || '').trim().length < MIN_PASSWORD_LENGTH) {
    throw new AppError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`, 400);
  }
}

async function listUsers() {
  const rows = await accessModel.listUsers();
  return rows.map(toPublicUser);
}

async function createUser(payload = {}) {
  const username = String(payload.username || '').trim();
  if (!USERNAME_PATTERN.test(username)) {
    throw new AppError('Username must be 3-60 characters: letters, numbers, dot, dash or underscore', 400);
  }
  validatePassword(payload.password);

  if (await accessModel.getUserByUsername(username)) {
    throw new AppError('That username is already taken', 409);
  }

  const passwordSalt = createPasswordSalt();
  const created = await accessModel.createUser({
    username,
    fullName: String(payload.fullName || '').trim(),
    role: normalizeRole(payload.role),
    passwordHash: hashPassword(payload.password, passwordSalt),
    passwordSalt,
  });
  return toPublicUser(created);
}

async function assertKeepsAnActiveAdmin(target, nextRole, nextActive) {
  const losesAdmin = target.role === ROLES.ADMIN && target.is_active && (nextRole !== ROLES.ADMIN || !nextActive);
  if (losesAdmin && (await accessModel.countActiveAdmins(target.id)) === 0) {
    throw new AppError('At least one active admin account is required', 400);
  }
}

async function updateUser(actingUser, userId, payload = {}) {
  const target = await accessModel.getUserById(userId);
  if (!target) {
    throw new AppError('User not found', 404);
  }

  const nextRole = payload.role !== undefined ? normalizeRole(payload.role) : target.role;
  const nextActive = payload.isActive !== undefined ? Boolean(payload.isActive) : Boolean(target.is_active);
  const nextFullName = payload.fullName !== undefined ? String(payload.fullName || '').trim() : target.full_name;

  if (Number(target.id) === Number(actingUser.id) && (nextRole !== ROLES.ADMIN || !nextActive)) {
    throw new AppError('You cannot remove admin access from or deactivate your own account', 400);
  }
  await assertKeepsAnActiveAdmin(target, nextRole, nextActive);

  const updated = await accessModel.updateUser(target.id, {
    fullName: nextFullName,
    role: nextRole,
    isActive: nextActive,
  });
  return toPublicUser(updated);
}

async function resetPassword(userId, password) {
  const target = await accessModel.getUserById(userId);
  if (!target) {
    throw new AppError('User not found', 404);
  }
  validatePassword(password);

  const passwordSalt = createPasswordSalt();
  await accessModel.updatePassword(target.id, hashPassword(password, passwordSalt), passwordSalt);
  return toPublicUser(target);
}

async function deleteUser(actingUser, userId) {
  const target = await accessModel.getUserById(userId);
  if (!target) {
    throw new AppError('User not found', 404);
  }
  if (Number(target.id) === Number(actingUser.id)) {
    throw new AppError('You cannot delete your own account', 400);
  }
  await assertKeepsAnActiveAdmin(target, null, false);

  await accessModel.deleteUser(target.id);
  return { id: Number(target.id) };
}

module.exports = {
  isAdmin,
  toPublicUser,
  getAccessSettings,
  updateAccessSettings,
  getPermissions,
  listUsers,
  createUser,
  updateUser,
  resetPassword,
  deleteUser,
};
