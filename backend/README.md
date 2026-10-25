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

## Roles
- **admin** – full access: all entry modules, reports, payments, master data, and staff management (Settings → Staff & Access).
- **staff** – can only add Godown entries, view and print the bills they entered. Editing their own entries is allowed only while the admin has switched on "Allow staff to edit their entries". Staff can never delete.

## Migrating an existing database
`scripts/migrate.js` upgrades an existing database **without modifying existing records**. It only adds
columns (`users.role`, `users.full_name`, `users.is_active`, `slips.created_by`), one index and the
`app_settings` table. Existing users become **admin**; existing slips get `created_by = NULL`.

```bash
cd backend
mysqldump -h <host> -u <user> -p <database> > backup-before-migration.sql   # 1. back up
npm run migrate          # 2. dry run: prints the exact SQL, changes nothing
npm run migrate:apply    # 3. apply, then verifies every existing table is unchanged
```

The apply step fingerprints every existing table (row count + checksum of all original columns)
before and after, and exits with an error if anything differs. It is safe to run more than once —
a second run reports "already up to date" — and if it is interrupted, running it again resumes.
The server also runs any pending migrations on start, so the script is only needed if you want to
migrate (and verify) before deploying.

```bash
node scripts/createUser.js <username> <password> [admin|staff]
node scripts/testLogin.js <username> <password> [port]
```
