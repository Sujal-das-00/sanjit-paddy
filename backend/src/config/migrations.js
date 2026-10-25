const { pool } = require('./database');

// Additive-only schema migrations. Every step only ADDS a column, index, table or a
// default settings row; none of them UPDATE, DELETE or rewrite an existing value.
// Each step inspects the live schema and returns only the statements still needed,
// so running the migrations again is always safe.

async function getColumns(connection, tableName) {
  const [rows] = await connection.execute(
    `
      SELECT COLUMN_NAME AS columnName
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
    `,
    [tableName]
  );
  return new Set(rows.map((row) => row.columnName));
}

async function hasTable(connection, tableName) {
  const [rows] = await connection.execute(
    'SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1',
    [tableName]
  );
  return rows.length > 0;
}

async function hasIndex(connection, tableName, indexName) {
  const [rows] = await connection.execute(
    'SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1',
    [tableName, indexName]
  );
  return rows.length > 0;
}

const MIGRATIONS = [
  {
    id: '001_users_roles',
    description: 'Add role, full_name and is_active to users',
    async pendingStatements(connection) {
      const columns = await getColumns(connection, 'users');
      const statements = [];
      if (!columns.has('role')) {
        // Accounts that existed before roles were introduced had full access, so the
        // new column starts them as admin. The default then switches to staff for
        // accounts created afterwards. No existing column value is touched.
        statements.push(
          "ALTER TABLE users ADD COLUMN role ENUM('admin','staff') NOT NULL DEFAULT 'admin' AFTER password_salt",
          "ALTER TABLE users ALTER COLUMN role SET DEFAULT 'staff'"
        );
      }
      if (!columns.has('full_name')) {
        statements.push('ALTER TABLE users ADD COLUMN full_name VARCHAR(120) NULL AFTER username');
      }
      if (!columns.has('is_active')) {
        statements.push('ALTER TABLE users ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER role');
      }
      return statements;
    },
  },
  {
    id: '002_slips_created_by',
    description: 'Track which user created each slip (slips.created_by)',
    async pendingStatements(connection) {
      const columns = await getColumns(connection, 'slips');
      const statements = [];
      if (!columns.has('created_by')) {
        // Existing slips get NULL: they were entered before tracking existed.
        statements.push('ALTER TABLE slips ADD COLUMN created_by BIGINT NULL');
      }
      if (!(await hasIndex(connection, 'slips', 'idx_slips_created_by'))) {
        statements.push('ALTER TABLE slips ADD KEY idx_slips_created_by (created_by)');
      }
      return statements;
    },
  },
  {
    id: '003_app_settings',
    description: 'Create app_settings with the "staff can edit" switch (off)',
    async pendingStatements(connection) {
      // INSERT IGNORE never overwrites a value the admin has already chosen.
      const seedDefault = "INSERT IGNORE INTO app_settings (setting_key, setting_value) VALUES ('staff_can_edit', '0')";

      if (!(await hasTable(connection, 'app_settings'))) {
        return [
          `CREATE TABLE app_settings (
  setting_key VARCHAR(80) PRIMARY KEY,
  setting_value VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)`,
          seedDefault,
        ];
      }

      const [rows] = await connection.execute(
        "SELECT 1 FROM app_settings WHERE setting_key = 'staff_can_edit' LIMIT 1"
      );
      return rows.length ? [] : [seedDefault];
    },
  },
];

const REQUIRED_TABLES = ['users', 'slips'];

async function assertPrerequisites(connection) {
  for (const tableName of REQUIRED_TABLES) {
    if (!(await hasTable(connection, tableName))) {
      throw new Error(`Table "${tableName}" not found in database. Run database/schema.sql on a new database first.`);
    }
  }
}

// Returns [{ id, description, statements }] for every migration that still has work to do.
async function planMigrations(connection) {
  await assertPrerequisites(connection);
  const plan = [];
  for (const migration of MIGRATIONS) {
    const statements = await migration.pendingStatements(connection);
    if (statements.length) {
      plan.push({ id: migration.id, description: migration.description, statements });
    }
  }
  return plan;
}

async function applyPlan(connection, plan, log = () => {}) {
  // MySQL DDL commits implicitly, so each statement is applied on its own; because
  // every step re-checks the schema, a re-run after an interruption simply resumes.
  for (const step of plan) {
    log(`→ ${step.id}: ${step.description}`);
    for (const statement of step.statements) {
      await connection.query(statement);
      log(`    ✓ ${statement.split('\n')[0]}`);
    }
  }
}

// Used on server start: quietly bring the schema up to date.
async function runPendingMigrations() {
  const connection = await pool.getConnection();
  try {
    const plan = await planMigrations(connection);
    if (plan.length) {
      await applyPlan(connection, plan, (line) => console.log(`[migrate] ${line}`));
    }
  } finally {
    connection.release();
  }
}

module.exports = { MIGRATIONS, planMigrations, applyPlan, runPendingMigrations };
