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
  const [username, password] = process.argv.slice(2);
  if (!username || !password) {
    console.error('Usage: node scripts/createUser.js <username> <password>');
    process.exit(1);
  }

  const salt = createSalt();
  const hash = hashPassword(password, salt);

  const existing = await query('SELECT id FROM users WHERE username = ? LIMIT 1', [username]);
  if (existing[0]) {
    await query('UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?', [hash, salt, existing[0].id]);
    console.log(`Updated password for existing user "${username}"`);
  } else {
    await query('INSERT INTO users (username, password_hash, password_salt) VALUES (?, ?, ?)', [username, hash, salt]);
    console.log(`Created new user "${username}"`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
