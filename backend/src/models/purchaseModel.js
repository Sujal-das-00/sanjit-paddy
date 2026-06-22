const { query, transaction } = require('../config/database');

async function findOrCreateParty(connection, tableName, nameField, nameValue) {
  if (!nameValue) return null;

  const [existingRows] = await connection.execute(
    `SELECT id FROM ${tableName} WHERE ${nameField} = ? LIMIT 1`,
    [nameValue]
  );

  if (existingRows.length) {
    return existingRows[0].id;
  }

  const [result] = await connection.execute(
    `INSERT INTO ${tableName} (${nameField}) VALUES (?)`,
    [nameValue]
  );

  return result.insertId;
}

async function findRiceTypeId(connection, riceTypeName) {
  if (!riceTypeName) return null;
  const [rows] = await connection.execute('SELECT id FROM rice_types WHERE name = ? LIMIT 1', [riceTypeName]);
  return rows.length ? rows[0].id : null;
}

function buildListWhere(moduleType, filters) {
  const clauses = ['s.module_type = ?'];
  const params = [moduleType];

  if (filters.dateFrom) {
    clauses.push('s.entry_date >= ?');
    params.push(filters.dateFrom);
  }

  if (filters.dateTo) {
    clauses.push('s.entry_date <= ?');
    params.push(filters.dateTo);
  }

  if (filters.search) {
    clauses.push(`(
      s.slip_number LIKE ? OR
      s.vehicle_number LIKE ? OR
      s.farmer_name_snapshot LIKE ? OR
      s.supplier_name_snapshot LIKE ? OR
      s.company_name_snapshot LIKE ?
    )`);
    const like = `%${filters.search}%`;
    params.push(like, like, like, like, like);
  }

  return { whereSql: clauses.join(' AND '), params };
}

async function listSlips(moduleType, filters = {}) {
  const { whereSql, params } = buildListWhere(moduleType, filters);
  return query(
    `
      SELECT
        s.*,
        COALESCE(v.paid_amount, 0) AS paid_amount,
        COALESCE(v.balance_amount, 0) AS balance_amount
      FROM slips s
      LEFT JOIN vw_slip_payment_summary v ON v.slip_id = s.id
      WHERE ${whereSql}
      ORDER BY s.entry_date DESC, s.created_at DESC
    `,
    params
  );
}

async function createSlip(payload) {
  return transaction(async (connection) => {
    const farmerId = payload.moduleType === 'home'
      ? await findOrCreateParty(connection, 'farmers', 'name', payload.farmerName)
      : null;
    const supplierId = payload.moduleType === 'godown'
      ? await findOrCreateParty(connection, 'suppliers', 'name', payload.supplierName)
      : null;
    const companyId = payload.moduleType === 'selling'
      ? await findOrCreateParty(connection, 'companies', 'name', payload.companyName)
      : null;
    const driverId = payload.driverName
      ? await findOrCreateParty(connection, 'drivers', 'name', payload.driverName)
      : null;

    const [existingRows] = await connection.execute(
      'SELECT id FROM slips WHERE module_type = ? AND slip_number = ? LIMIT 1',
      [payload.moduleType, payload.slipNumber]
    );

    let slipId;

    if (existingRows.length) {
      slipId = existingRows[0].id;
      await connection.execute(
        `
          UPDATE slips
          SET entry_date = ?, vehicle_number = ?,
              farmer_id = ?, supplier_id = ?, company_id = ?, driver_id = ?,
              farmer_name_snapshot = ?, supplier_name_snapshot = ?, company_name_snapshot = ?, driver_name_snapshot = ?,
              gross_weight = ?, dust_deduction = ?, moisture_deduction = ?, final_weight = ?, net_weight = ?,
              total_bags = ?, average_weight = ?, moisture_note = ?, loading_discount = ?, advance_payment = ?,
              purchase_total = ?, final_payable = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [
          payload.entryDate,
          payload.vehicleNumber || null,
          farmerId,
          supplierId,
          companyId,
          driverId,
          payload.farmerName || null,
          payload.supplierName || null,
          payload.companyName || null,
          payload.driverName || null,
          payload.grossWeight,
          payload.dustDeduction,
          payload.moistureDeduction,
          payload.finalWeight,
          payload.netWeight,
          payload.totalBags,
          payload.averageWeight,
          payload.moistureNote || null,
          payload.loadingDiscount,
          payload.advancePayment,
          payload.purchaseTotal,
          payload.finalPayable,
          slipId,
        ]
      );
      await connection.execute('DELETE FROM slip_items WHERE slip_id = ?', [slipId]);
    } else {
      const [slipResult] = await connection.execute(
        `
          INSERT INTO slips (
            module_type, slip_number, entry_date, vehicle_number,
            farmer_id, supplier_id, company_id, driver_id,
            farmer_name_snapshot, supplier_name_snapshot, company_name_snapshot, driver_name_snapshot,
            gross_weight, dust_deduction, moisture_deduction, final_weight, net_weight,
            total_bags, average_weight, moisture_note, loading_discount, advance_payment,
            purchase_total, final_payable
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          payload.moduleType,
          payload.slipNumber,
          payload.entryDate,
          payload.vehicleNumber || null,
          farmerId,
          supplierId,
          companyId,
          driverId,
          payload.farmerName || null,
          payload.supplierName || null,
          payload.companyName || null,
          payload.driverName || null,
          payload.grossWeight,
          payload.dustDeduction,
          payload.moistureDeduction,
          payload.finalWeight,
          payload.netWeight,
          payload.totalBags,
          payload.averageWeight,
          payload.moistureNote || null,
          payload.loadingDiscount,
          payload.advancePayment,
          payload.purchaseTotal,
          payload.finalPayable,
        ]
      );
      slipId = slipResult.insertId;
    }

    for (const entry of payload.entries) {
      const riceTypeId = await findRiceTypeId(connection, entry.riceTypeName);
      await connection.execute(
        `
          INSERT INTO slip_items (
            slip_id, rice_type_id, rice_type_name_snapshot, bag_count,
            weight_per_bag, total_weight, rate_per_kg, total_amount
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          slipId,
          riceTypeId,
          entry.riceTypeName || '-',
          entry.bagCount,
          entry.weightPerBag,
          entry.totalWeight,
          entry.ratePerKg,
          entry.totalAmount,
        ]
      );
    }

    return getSlipByIdWithConnection(connection, slipId);
  });
}

async function getSlipHeaderById(slipId) {
  const rows = await query('SELECT * FROM slips WHERE id = ?', [slipId]);
  return rows[0] || null;
}

async function getSlipByIdWithConnection(connection, slipId) {
  const [slipRows] = await connection.execute(
    `
      SELECT s.*, COALESCE(v.paid_amount, 0) AS paid_amount, COALESCE(v.balance_amount, 0) AS balance_amount
      FROM slips s
      LEFT JOIN vw_slip_payment_summary v ON v.slip_id = s.id
      WHERE s.id = ?
    `,
    [slipId]
  );

  if (!slipRows.length) return null;

  const [itemRows] = await connection.execute(
    'SELECT * FROM slip_items WHERE slip_id = ? ORDER BY id ASC',
    [slipId]
  );

  return { ...slipRows[0], items: itemRows };
}

async function getSlipById(slipId) {
  return transaction(async (connection) => getSlipByIdWithConnection(connection, slipId));
}

async function updateSlipById(slipId, payload) {
  return transaction(async (connection) => {
    const current = await getSlipByIdWithConnection(connection, slipId);
    if (!current) return null;

    await connection.execute(
      `
        UPDATE slips
        SET entry_date = ?, vehicle_number = ?,
            farmer_name_snapshot = ?, supplier_name_snapshot = ?, company_name_snapshot = ?, driver_name_snapshot = ?,
            gross_weight = ?, dust_deduction = ?, moisture_deduction = ?, final_weight = ?, net_weight = ?,
            total_bags = ?, average_weight = ?, moisture_note = ?, loading_discount = ?, advance_payment = ?,
            purchase_total = ?, final_payable = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
        payload.entryDate,
        payload.vehicleNumber || null,
        payload.farmerName || null,
        payload.supplierName || null,
        payload.companyName || null,
        payload.driverName || null,
        payload.grossWeight,
        payload.dustDeduction,
        payload.moistureDeduction,
        payload.finalWeight,
        payload.netWeight,
        payload.totalBags,
        payload.averageWeight,
        payload.moistureNote || null,
        payload.loadingDiscount,
        payload.advancePayment,
        payload.purchaseTotal,
        payload.finalPayable,
        slipId,
      ]
    );

    await connection.execute('DELETE FROM slip_items WHERE slip_id = ?', [slipId]);

    for (const entry of payload.entries) {
      const riceTypeId = await findRiceTypeId(connection, entry.riceTypeName);
      await connection.execute(
        `
          INSERT INTO slip_items (
            slip_id, rice_type_id, rice_type_name_snapshot, bag_count,
            weight_per_bag, total_weight, rate_per_kg, total_amount
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          slipId,
          riceTypeId,
          entry.riceTypeName || '-',
          entry.bagCount,
          entry.weightPerBag,
          entry.totalWeight,
          entry.ratePerKg,
          entry.totalAmount,
        ]
      );
    }

    return getSlipByIdWithConnection(connection, slipId);
  });
}

module.exports = {
  listSlips,
  createSlip,
  getSlipById,
  getSlipHeaderById,
  updateSlipById,
};
