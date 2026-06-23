const crypto = require('crypto');
const { query, pool } = require('../src/config/database');

const ITERATIONS = 120000;
const KEY_LENGTH = 64;
const DIGEST = 'sha512';

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(String(password).trim(), salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
}

async function main() {
  const [username, password] = process.argv.slice(2);
  if (!username || !password) {
    console.error('Usage: node scripts/checkPassword.js <username> <password>');
    process.exit(1);
  }

  const rows = await query('SELECT * FROM users WHERE username = ? LIMIT 1', [username]);
  const user = rows[0];
  if (!user) {
    console.log('NO SUCH USER');
    await pool.end();
    return;
  }

  const computed = hashPassword(password, user.password_salt);
  console.log(computed === user.password_hash ? 'MATCH' : 'NO MATCH');
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
