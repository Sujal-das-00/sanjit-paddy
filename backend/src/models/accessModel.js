const { query } = require('../config/database');

const PUBLIC_USER_COLUMNS = 'id, username, full_name, role, is_active, created_at, updated_at';

async function getSetting(key) {
  const rows = await query('SELECT setting_value FROM app_settings WHERE setting_key = ? LIMIT 1', [key]);
  return rows[0] ? rows[0].setting_value : null;
}

async function setSetting(key, value) {
  await query(
    `
      INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?)
      ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP
    `,
    [key, String(value)]
  );
}

async function listUsers() {
  return query(
    `
      SELECT ${PUBLIC_USER_COLUMNS},
        (SELECT COUNT(*) FROM slips s WHERE s.created_by = users.id) AS entry_count
      FROM users
      ORDER BY role = 'admin' DESC, username ASC
    `
  );
}

async function getUserById(id) {
  const rows = await query(`SELECT ${PUBLIC_USER_COLUMNS} FROM users WHERE id = ? LIMIT 1`, [id]);
  return rows[0] || null;
}

async function getUserByUsername(username) {
  const rows = await query('SELECT id FROM users WHERE username = ? LIMIT 1', [username]);
  return rows[0] || null;
}

async function createUser({ username, fullName, role, passwordHash, passwordSalt }) {
  const result = await query(
    'INSERT INTO users (username, full_name, role, password_hash, password_salt, is_active) VALUES (?, ?, ?, ?, ?, 1)',
    [username, fullName || null, role, passwordHash, passwordSalt]
  );
  return getUserById(result.insertId);
}

async function updateUser(id, { fullName, role, isActive }) {
  await query(
    'UPDATE users SET full_name = ?, role = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [fullName || null, role, isActive ? 1 : 0, id]
  );
  return getUserById(id);
}

async function updatePassword(id, passwordHash, passwordSalt) {
  await query(
    'UPDATE users SET password_hash = ?, password_salt = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [passwordHash, passwordSalt, id]
  );
}

async function deleteUser(id) {
  // Entries the user created stay; slips.created_by simply points at a user that no longer exists.
  await query('DELETE FROM users WHERE id = ?', [id]);
}

async function countActiveAdmins(excludeUserId = null) {
  const rows = await query(
    "SELECT COUNT(*) AS total FROM users WHERE role = 'admin' AND is_active = 1 AND id <> ?",
    [excludeUserId || 0]
  );
  return Number(rows[0]?.total || 0);
}

module.exports = {
  getSetting,
  setSetting,
  listUsers,
  getUserById,
  getUserByUsername,
  createUser,
  updateUser,
  updatePassword,
  deleteUser,
  countActiveAdmins,
};
