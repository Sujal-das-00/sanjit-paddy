const { query, transaction } = require('../config/database');

function normalizeAccountNumbers(accountNumbers = []) {
  return [...new Set(
    accountNumbers
      .map((value) => String(value || '').trim())
      .filter(Boolean)
  )];
}

async function listSupplierAccountsByIds(supplierIds) {
  if (!supplierIds.length) {
    return new Map();
  }

  const placeholders = supplierIds.map(() => '?').join(', ');
  const rows = await query(
    `
      SELECT supplier_id AS supplierId, account_number AS accountNumber
      FROM supplier_account_numbers
      WHERE supplier_id IN (${placeholders}) AND is_active = 1
      ORDER BY id ASC
    `,
    supplierIds
  );

  return rows.reduce((accumulator, row) => {
    const items = accumulator.get(row.supplierId) || [];
    items.push(row.accountNumber);
    accumulator.set(row.supplierId, items);
    return accumulator;
  }, new Map());
}

async function listRiceTypes() {
  return query('SELECT * FROM rice_types WHERE is_active = 1 ORDER BY name ASC');
}

async function createRiceType(payload) {
  const name = payload.name.trim();
  const existingRows = await query('SELECT id FROM rice_types WHERE name = ? LIMIT 1', [name]);

  if (existingRows.length) {
    await query('UPDATE rice_types SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [existingRows[0].id]);
    return { id: existingRows[0].id, name };
  }

  const result = await query('INSERT INTO rice_types (name) VALUES (?)', [name]);
  return { id: result.insertId, name };
}

async function updateRiceType(id, payload) {
  const name = payload.name.trim();
  await query(
    'UPDATE rice_types SET name = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name, id]
  );
  return { id: Number(id), name };
}

async function deleteRiceType(id) {
  await query('UPDATE rice_types SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
  return { id: Number(id) };
}

async function listFarmers() {
  return query('SELECT * FROM farmers WHERE is_active = 1 ORDER BY name ASC');
}

async function createFarmer(payload) {
  const result = await query(
    'INSERT INTO farmers (name, mobile, village, address, aadhar_number) VALUES (?, ?, ?, ?, ?)',
    [payload.name.trim(), payload.mobile || null, payload.village || null, payload.address || null, payload.aadharNumber || null]
  );
  return { id: result.insertId, ...payload };
}

async function listSuppliers() {
  const rows = await query('SELECT * FROM suppliers WHERE is_active = 1 ORDER BY name ASC');
  const accountsBySupplierId = await listSupplierAccountsByIds(rows.map((row) => row.id));
  return rows.map((row) => ({
    ...row,
    account_numbers: accountsBySupplierId.get(row.id) || [],
  }));
}

async function createSupplier(payload) {
  const name = payload.name.trim();
  const mobile = payload.mobile || null;
  const panNumber = payload.panNumber || null;
  const aadharNumber = payload.aadharNumber || null;
  const address = payload.address || null;
  const accountNumbers = normalizeAccountNumbers(payload.accountNumbers);

  return transaction(async (connection) => {
    const [existingRows] = await connection.execute(
      'SELECT id FROM suppliers WHERE name = ? AND ((mobile = ?) OR (mobile IS NULL AND ? IS NULL)) LIMIT 1',
      [name, mobile, mobile]
    );

    let supplierId;

    if (existingRows.length) {
      supplierId = existingRows[0].id;
      await connection.execute(
        `
          UPDATE suppliers
          SET mobile = ?, pan_number = ?, aadhar_number = ?, address = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [mobile, panNumber, aadharNumber, address, supplierId]
      );
    } else {
      const [result] = await connection.execute(
        'INSERT INTO suppliers (name, mobile, pan_number, aadhar_number, address) VALUES (?, ?, ?, ?, ?)',
        [name, mobile, panNumber, aadharNumber, address]
      );
      supplierId = result.insertId;
    }

    for (const accountNumber of accountNumbers) {
      const [existingAccounts] = await connection.execute(
        'SELECT id FROM supplier_account_numbers WHERE supplier_id = ? AND account_number = ? LIMIT 1',
        [supplierId, accountNumber]
      );

      if (existingAccounts.length) {
        await connection.execute(
          'UPDATE supplier_account_numbers SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [existingAccounts[0].id]
        );
      } else {
        await connection.execute(
          'INSERT INTO supplier_account_numbers (supplier_id, account_number) VALUES (?, ?)',
          [supplierId, accountNumber]
        );
      }
    }

    return {
      id: supplierId,
      name,
      mobile,
      panNumber,
      aadharNumber,
      address,
      accountNumbers,
    };
  });
}

async function updateSupplier(id, payload) {
  const name = payload.name.trim();
  const mobile = payload.mobile || null;
  const panNumber = payload.panNumber || null;
  const aadharNumber = payload.aadharNumber || null;
  const address = payload.address || null;
  const accountNumbers = normalizeAccountNumbers(payload.accountNumbers);

  return transaction(async (connection) => {
    await connection.execute(
      `
        UPDATE suppliers
        SET name = ?, mobile = ?, pan_number = ?, aadhar_number = ?, address = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [name, mobile, panNumber, aadharNumber, address, id]
    );

    await connection.execute(
      'UPDATE supplier_account_numbers SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE supplier_id = ?',
      [id]
    );

    for (const accountNumber of accountNumbers) {
      const [existingAccounts] = await connection.execute(
        'SELECT id FROM supplier_account_numbers WHERE supplier_id = ? AND account_number = ? LIMIT 1',
        [id, accountNumber]
      );

      if (existingAccounts.length) {
        await connection.execute(
          'UPDATE supplier_account_numbers SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [existingAccounts[0].id]
        );
      } else {
        await connection.execute(
          'INSERT INTO supplier_account_numbers (supplier_id, account_number) VALUES (?, ?)',
          [id, accountNumber]
        );
      }
    }

    return {
      id: Number(id),
      name,
      mobile,
      panNumber,
      aadharNumber,
      address,
      accountNumbers,
    };
  });
}

async function deleteSupplier(id) {
  await query('UPDATE suppliers SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
  return { id: Number(id) };
}

async function listSupplierAccountNumbersByName(name) {
  const rows = await query(
    `
      SELECT san.account_number AS accountNumber
      FROM suppliers s
      JOIN supplier_account_numbers san ON san.supplier_id = s.id
      WHERE s.name = ? AND san.is_active = 1
      ORDER BY san.id ASC
    `,
    [name]
  );

  return normalizeAccountNumbers(rows.map((row) => row.accountNumber));
}

async function listDrivers() {
  return query('SELECT * FROM drivers WHERE is_active = 1 ORDER BY name ASC');
}

async function createDriver(payload) {
  const name = payload.name.trim();
  const mobile = payload.mobile || null;
  const licenseNumber = payload.licenseNumber || null;
  const existingRows = await query(
    'SELECT id FROM drivers WHERE name = ? AND ((mobile = ?) OR (mobile IS NULL AND ? IS NULL)) LIMIT 1',
    [name, mobile, mobile]
  );

  if (existingRows.length) {
    await query(
      'UPDATE drivers SET mobile = ?, license_number = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [mobile, licenseNumber, existingRows[0].id]
    );
    return { id: existingRows[0].id, name, mobile, licenseNumber };
  }

  const result = await query(
    'INSERT INTO drivers (name, mobile, license_number) VALUES (?, ?, ?)',
    [name, mobile, licenseNumber]
  );
  return { id: result.insertId, name, mobile, licenseNumber };
}

async function updateDriver(id, payload) {
  const name = payload.name.trim();
  const mobile = payload.mobile || null;
  const licenseNumber = payload.licenseNumber || null;
  await query(
    'UPDATE drivers SET name = ?, mobile = ?, license_number = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name, mobile, licenseNumber, id]
  );
  return { id: Number(id), name, mobile, licenseNumber };
}

async function deleteDriver(id) {
  await query('UPDATE drivers SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
  return { id: Number(id) };
}

async function listCompanies() {
  return query('SELECT * FROM companies WHERE is_active = 1 ORDER BY name ASC');
}

async function createCompany(payload) {
  const name = payload.name.trim();
  const mobile = payload.mobile || null;
  const contactPerson = payload.contactPerson || null;
  const address = payload.address || null;
  const gstNumber = payload.gstNumber || null;
  const existingRows = await query(
    'SELECT id FROM companies WHERE name = ? AND ((mobile = ?) OR (mobile IS NULL AND ? IS NULL)) LIMIT 1',
    [name, mobile, mobile]
  );

  if (existingRows.length) {
    await query(
      'UPDATE companies SET mobile = ?, contact_person = ?, address = ?, gst_number = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [mobile, contactPerson, address, gstNumber, existingRows[0].id]
    );
    return { id: existingRows[0].id, name, mobile, contactPerson, address, gstNumber };
  }

  const result = await query(
    'INSERT INTO companies (name, mobile, contact_person, address, gst_number) VALUES (?, ?, ?, ?, ?)',
    [name, mobile, contactPerson, address, gstNumber]
  );
  return { id: result.insertId, name, mobile, contactPerson, address, gstNumber };
}

async function updateCompany(id, payload) {
  const name = payload.name.trim();
  const mobile = payload.mobile || null;
  const contactPerson = payload.contactPerson || null;
  const address = payload.address || null;
  const gstNumber = payload.gstNumber || null;
  await query(
    'UPDATE companies SET name = ?, mobile = ?, contact_person = ?, address = ?, gst_number = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name, mobile, contactPerson, address, gstNumber, id]
  );
  return { id: Number(id), name, mobile, contactPerson, address, gstNumber };
}

async function deleteCompany(id) {
  await query('UPDATE companies SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
  return { id: Number(id) };
}

module.exports = {
  listRiceTypes,
  createRiceType,
  updateRiceType,
  deleteRiceType,
  listFarmers,
  createFarmer,
  listSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  listSupplierAccountNumbersByName,
  listDrivers,
  createDriver,
  updateDriver,
  deleteDriver,
  listCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
};
