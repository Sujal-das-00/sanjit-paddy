const { query } = require('../config/database');

async function getUserByUsername(username) {
  const rows = await query('SELECT * FROM users WHERE username = ? LIMIT 1', [username]);
  return rows[0] || null;
}

async function updatePassword(userId, passwordHash, passwordSalt) {
  await query(
    'UPDATE users SET password_hash = ?, password_salt = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [passwordHash, passwordSalt, userId]
  );
}

module.exports = { getUserByUsername, updatePassword };
