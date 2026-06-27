const { pool } = require('./database');

async function hasTable(connection, tableName) {
  const [rows] = await connection.execute(
    `
      SELECT 1
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
      LIMIT 1
    `,
    [tableName]
  );

  return rows.length > 0;
}

async function getColumns(connection, tableName) {
  const [rows] = await connection.execute(
    `
      SELECT COLUMN_NAME AS columnName, IS_NULLABLE AS isNullable
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
    `,
    [tableName]
  );

  return rows.reduce((accumulator, row) => {
    accumulator[row.columnName] = row;
    return accumulator;
  }, {});
}

async function hasIndex(connection, tableName, indexName) {
  const [rows] = await connection.execute(
    `
      SELECT 1
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?
      LIMIT 1
    `,
    [tableName, indexName]
  );

  return rows.length > 0;
}

async function ensurePaymentsTableShape(connection) {
  const columns = await getColumns(connection, 'payments');

  if (columns.slip_id && columns.slip_id.isNullable === 'NO') {
    await connection.execute('ALTER TABLE payments MODIFY slip_id BIGINT NULL');
  }

  if (!columns.party_view) {
    await connection.execute(
      "ALTER TABLE payments ADD COLUMN party_view ENUM('farmers','suppliers','company') NULL AFTER slip_id"
    );
  }

  if (!columns.party_name) {
    await connection.execute('ALTER TABLE payments ADD COLUMN party_name VARCHAR(180) NULL AFTER party_view');
  }

  if (!columns.bank_account) {
    await connection.execute('ALTER TABLE payments ADD COLUMN bank_account VARCHAR(160) NULL AFTER amount');
  }

  if (!(await hasIndex(connection, 'payments', 'idx_payments_party'))) {
    await connection.execute('ALTER TABLE payments ADD KEY idx_payments_party (party_view, party_name)');
  }

  if (!(await hasIndex(connection, 'payments', 'idx_payments_bank_account'))) {
    await connection.execute('ALTER TABLE payments ADD KEY idx_payments_bank_account (bank_account)');
  }

  if (!(await hasIndex(connection, 'payments', 'idx_payments_reference_code'))) {
    await connection.execute('ALTER TABLE payments ADD KEY idx_payments_reference_code (reference_code)');
  }
}

async function ensurePaymentAllocationsTable(connection) {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS payment_allocations (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      payment_id BIGINT NOT NULL,
      slip_id BIGINT NOT NULL,
      allocated_amount DECIMAL(12,2) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_payment_allocations_payment (payment_id),
      KEY idx_payment_allocations_slip (slip_id),
      CONSTRAINT fk_payment_allocations_payment FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
      CONSTRAINT fk_payment_allocations_slip FOREIGN KEY (slip_id) REFERENCES slips(id) ON DELETE CASCADE
    )
  `);
}

async function ensureSupplierAccountNumbersTable(connection) {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS supplier_account_numbers (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      supplier_id BIGINT NOT NULL,
      account_number VARCHAR(160) NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_supplier_account_numbers_supplier (supplier_id),
      UNIQUE KEY uniq_supplier_account_number (supplier_id, account_number),
      CONSTRAINT fk_supplier_account_numbers_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
    )
  `);
}

async function backfillPartyFields(connection) {
  await connection.execute(`
    UPDATE payments p
    JOIN slips s ON s.id = p.slip_id
    SET
      p.party_view = CASE
        WHEN s.module_type = 'home' THEN 'farmers'
        WHEN s.module_type = 'godown' THEN 'suppliers'
        ELSE 'company'
      END,
      p.party_name = COALESCE(
        s.farmer_name_snapshot,
        s.supplier_name_snapshot,
        s.company_name_snapshot
      )
    WHERE p.slip_id IS NOT NULL
      AND (p.party_view IS NULL OR p.party_name IS NULL OR p.party_name = '')
  `);
}

async function backfillPaymentAllocations(connection) {
  await connection.execute(`
    INSERT INTO payment_allocations (payment_id, slip_id, allocated_amount)
    SELECT p.id, p.slip_id, p.amount
    FROM payments p
    LEFT JOIN payment_allocations pa ON pa.payment_id = p.id
    WHERE p.slip_id IS NOT NULL
      AND pa.id IS NULL
  `);
}

async function ensureSlipItemsMoistureColumns(connection) {
  const columns = await getColumns(connection, 'slip_items');

  if (!columns.moisture_per_1000) {
    await connection.execute('ALTER TABLE slip_items ADD COLUMN moisture_per_1000 DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER total_weight');
  }

  if (!columns.moisture_deduction) {
    await connection.execute('ALTER TABLE slip_items ADD COLUMN moisture_deduction DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER moisture_per_1000');
  }

  if (!columns.net_weight) {
    await connection.execute('ALTER TABLE slip_items ADD COLUMN net_weight DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER moisture_deduction');
    await connection.execute('UPDATE slip_items SET net_weight = total_weight WHERE net_weight = 0');
  }
}

async function recreateSlipPaymentSummaryView(connection) {
  await connection.execute(`
    CREATE OR REPLACE VIEW vw_slip_payment_summary AS
    SELECT
      s.id AS slip_id,
      COALESCE(s.advance_payment, 0) + COALESCE(SUM(pa.allocated_amount), 0) AS paid_amount,
      GREATEST(COALESCE(s.final_payable, 0) - COALESCE(SUM(pa.allocated_amount), 0), 0) AS balance_amount
    FROM slips s
    LEFT JOIN payment_allocations pa ON pa.slip_id = s.id
    GROUP BY s.id, s.final_payable, s.advance_payment
  `);
}


async function ensureUsersTable(connection) {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      username VARCHAR(60) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      password_salt VARCHAR(64) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await connection.execute(`
    INSERT INTO users (username, password_hash, password_salt)
    SELECT 'admin', 'a9f64d7e0c2a4e719871de46c4d73f6684728ccf42cfe2db7b6a767415c571808b3e4631d24f082f5c579b7e6b2a9e28bae7bd3733b8ff521040fda18ec8726a', '9b5d7e3a1c4f6a8b'
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin')
  `);
}

async function ensurePaymentSchema() {
  const connection = await pool.getConnection();

  try {
    const hasPayments = await hasTable(connection, 'payments');
    const hasSlips = await hasTable(connection, 'slips');
    const hasSuppliers = await hasTable(connection, 'suppliers');
    const hasSlipItems = await hasTable(connection, 'slip_items');

    await connection.beginTransaction();

    if (hasSuppliers) {
      await ensureSupplierAccountNumbersTable(connection);
    }

    await ensureUsersTable(connection);

    if (hasSlipItems) {
      await ensureSlipItemsMoistureColumns(connection);
    }

    if (!hasPayments || !hasSlips) {
      await connection.commit();
      return;
    }

    await ensurePaymentsTableShape(connection);
    await ensurePaymentAllocationsTable(connection);
    await backfillPartyFields(connection);
    await backfillPaymentAllocations(connection);
    await recreateSlipPaymentSummaryView(connection);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { ensurePaymentSchema };
