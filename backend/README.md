# Paddy Management Backend

Node.js + Express backend for the paddy management app using MVC architecture and SQL.

## Features
- Dashboard summary APIs
- Godown purchase APIs
- Home purchase APIs
- Selling APIs
- Reports APIs
- Payments APIs
- Master data APIs for rice, farmers, suppliers, drivers, and companies

## Setup
1. Create a SQL database.
2. Run `database/schema.sql`.
3. Copy `.env.example` to `.env` and update credentials.
4. Install dependencies with `npm install`.
5. Start with `npm run dev` or `npm start`.

## Entry Point
- `src/server.js`

```bash
node -e "
const authService = require('./src/services/authService');
const authModel = require('./src/models/authModel');
(async () => {
  const password = process.argv[1];
  const salt = authService.createPasswordSalt();
  const hash = authService.hashPassword(password, salt);
  const user = await authModel.getUserByUsername('admin');
  await authModel.updatePassword(user.id, hash, salt);
  console.log('Password updated for admin.');
  process.exit(0);
})();
" "YourNewPassword123"
node scripts/createUser.js <username> <password>

```