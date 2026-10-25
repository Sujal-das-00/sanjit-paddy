const crypto = require('crypto');
const { query, pool } = require('../src/config/database');

const ITERATIONS = 120000;
const KEY_LENGTH = 64;
const DIGEST = 'sha512';

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(String(password), salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
}

function createSalt() {
  return crypto.randomBytes(8).toString('hex');
}

async function main() {
  const [username, password, role] = process.argv.slice(2);
  if (!username || !password || (role && !['admin', 'staff'].includes(role))) {
    console.error('Usage: node scripts/createUser.js <username> <password> [admin|staff]');
    process.exit(1);
  }

  const salt = createSalt();
  const hash = hashPassword(password, salt);

  const existing = await query('SELECT id FROM users WHERE username = ? LIMIT 1', [username]);
  if (existing[0]) {
    await query('UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?', [hash, salt, existing[0].id]);
    if (role) {
      await query('UPDATE users SET role = ? WHERE id = ?', [role, existing[0].id]);
    }
    console.log(`Updated password for existing user "${username}"${role ? ` (role: ${role})` : ''}`);
  } else {
    await query('INSERT INTO users (username, password_hash, password_salt, role) VALUES (?, ?, ?, ?)', [
      username,
      hash,
      salt,
      role || 'admin',
    ]);
    console.log(`Created new user "${username}" (role: ${role || 'admin'})`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
