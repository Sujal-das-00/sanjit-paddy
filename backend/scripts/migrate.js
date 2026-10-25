// Brings the database schema up to date without changing existing records.
//
//   node scripts/migrate.js            dry run: shows what would change, touches nothing
//   node scripts/migrate.js --apply    applies the changes, then proves existing data is unchanged
//
// Connection settings come from backend/.env (DB_HOST, DB_NAME, DB_USER, ...).

const { pool } = require('../src/config/database');
const { env } = require('../src/config/env');
const { planMigrations, applyPlan } = require('../src/config/migrations');

const apply = process.argv.includes('--apply');

async function listBaseTables(connection) {
  const [rows] = await connection.execute(
    "SELECT TABLE_NAME AS tableName FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME"
  );
  return rows.map((row) => row.tableName);
}

async function listColumns(connection, tableName) {
  const [rows] = await connection.execute(
    'SELECT COLUMN_NAME AS columnName FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION',
    [tableName]
  );
  return rows.map((row) => row.columnName);
}

// Row count plus a checksum over every column that exists *before* migrating.
// Re-computing it afterwards over the same columns proves no existing value moved.
async function fingerprint(connection, columnsByTable) {
  const result = {};
  for (const [tableName, columns] of Object.entries(columnsByTable)) {
    const rowExpression = columns.map((column) => `IFNULL(\`${column}\`, '<NULL>')`).join(', ');
    const [[row]] = await connection.query(
      `SELECT COUNT(*) AS total, COALESCE(SUM(CRC32(CONCAT_WS('|', ${rowExpression}))), 0) AS checksum FROM \`${tableName}\``
    );
    result[tableName] = { rows: Number(row.total), checksum: String(row.checksum) };
  }
  return result;
}

function printPlan(plan) {
  for (const step of plan) {
    console.log(`\n  ${step.id} — ${step.description}`);
    for (const statement of step.statements) {
      console.log(`    ${statement.replace(/\n/g, '\n    ')};`);
    }
  }
}

async function main() {
  const connection = await pool.getConnection();
  try {
    console.log(`Database: ${env.dbName} on ${env.dbHost}:${env.dbPort} (user ${env.dbUser})`);
    const plan = await planMigrations(connection);

    if (!plan.length) {
      console.log('\nSchema is already up to date. Nothing to do.');
      return;
    }

    console.log(`\n${plan.length} migration(s) pending:`);
    printPlan(plan);
    console.log('\nThese statements only ADD columns / an index / a table. No existing row is updated or deleted.');

    if (!apply) {
      console.log('\nDry run only — nothing was changed. Re-run with --apply to migrate.');
      console.log(`Tip: back up first, e.g.  mysqldump -h ${env.dbHost} -u ${env.dbUser} -p ${env.dbName} > backup.sql`);
      return;
    }

    const columnsByTable = {};
    for (const tableName of await listBaseTables(connection)) {
      columnsByTable[tableName] = await listColumns(connection, tableName);
    }

    console.log('\nFingerprinting existing data...');
    const before = await fingerprint(connection, columnsByTable);

    console.log('Applying...');
    await applyPlan(connection, plan, (line) => console.log(`  ${line}`));

    console.log('\nVerifying existing data is unchanged...');
    const after = await fingerprint(connection, columnsByTable);
    let changed = false;
    for (const tableName of Object.keys(before)) {
      const same = before[tableName].rows === after[tableName].rows && before[tableName].checksum === after[tableName].checksum;
      if (!same) changed = true;
      console.log(`  ${same ? '✓' : '✗'} ${tableName.padEnd(26)} ${String(after[tableName].rows).padStart(7)} rows ${same ? 'unchanged' : 'CHANGED'}`);
    }

    if (changed) {
      console.error('\nWARNING: existing data differs from before the migration. Check the tables marked ✗ (another process may have written to them while migrating).');
      process.exitCode = 1;
      return;
    }

    const remaining = await planMigrations(connection);
    console.log(remaining.length ? '\nSome steps are still pending — run again.' : '\nMigration complete. All existing records are unchanged.');
  } finally {
    connection.release();
    await pool.end();
  }
}

main().catch(async (error) => {
  console.error(`\nMigration failed: ${error.message}`);
  console.error('Nothing already applied needs undoing; fix the cause and run the script again — it resumes where it stopped.');
  await pool.end().catch(() => {});
  process.exit(1);
});
