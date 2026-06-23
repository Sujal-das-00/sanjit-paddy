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
3. Create `.env` and update credentials.
4. Install dependencies with `npm install`.
5. Start with `npm run dev` or `npm start`.

Required backend environment variables:
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `AUTH_COOKIE_SECRET`

## Entry Point
- `src/server.js`

```bash
node scripts/createUser.js <username> <password>
node scripts/testLogin.js <username> <password> [port]
```
