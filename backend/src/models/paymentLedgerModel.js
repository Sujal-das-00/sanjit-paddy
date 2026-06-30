const { query } = require('../config/database');
const { AppError } = require('../utils/AppError');
const { toNumber } = require('../utils/number');

const PARTY_VIEW_TO_MODULE_TYPE = {
  farmers: 'home',
  suppliers: 'godown',
  company: 'selling',
};

function getModuleTypeForPartyView(partyView) {
  return PARTY_VIEW_TO_MODULE_TYPE[partyView] || null;
}

function getPartyNameExpression(alias = 's') {
  return `COALESCE(${alias}.farmer_name_snapshot, ${alias}.supplier_name_snapshot, ${alias}.company_name_snapshot)`;
}

function getWhereClauseForParty(alias, partyView, partyName) {
  const moduleType = getModuleTypeForPartyView(partyView);
  if (!moduleType) {
    throw new Error(`Unsupported party view: ${partyView}`);
  }

  return {
    whereSql: `${alias}.module_type = ? AND ${getPartyNameExpression(alias)} = ?`,
    params: [moduleType, partyName],
  };
}

function mapSlipSummary(row) {
  return {
    id: row.id,
    entryDate: row.entryDate,
    slipNumber: row.slipNumber,
    vehicleNumber: row.vehicleNumber || '',
    totalBags: toNumber(row.totalBags),
    netWeight: toNumber(row.netWeight),
    grossWeight: toNumber(row.grossWeight),
    advancePayment: toNumber(row.advancePayment),
    finalPayable: toNumber(row.finalPayable),
    totalAmount: toNumber(row.totalAmount),
    paidAmount: toNumber(row.paidAmount),
    balanceAmount: toNumber(row.balanceAmount),
  };
}

async function listPartySlips(executor, partyView, partyName, options = {}) {
  const { whereSql, params } = getWhereClauseForParty('s', partyView, partyName);
  const lockingSql = options.forUpdate ? ' FOR UPDATE' : '';
  const rows = await executor(
    `
      SELECT
        s.id,
        s.entry_date AS entryDate,
        s.slip_number AS slipNumber,
        s.vehicle_number AS vehicleNumber,
        s.total_bags AS totalBags,
        s.net_weight AS netWeight,
        s.gross_weight AS grossWeight,
        s.advance_payment AS advancePayment,
        s.final_payable AS finalPayable,
        s.final_payable + s.advance_payment AS totalAmount,
        COALESCE(s.advance_payment, 0) + COALESCE(SUM(pa.allocated_amount), 0) AS paidAmount,
        GREATEST(COALESCE(s.final_payable, 0) - COALESCE(SUM(pa.allocated_amount), 0), 0) AS balanceAmount
      FROM slips s
      LEFT JOIN payment_allocations pa ON pa.slip_id = s.id
      WHERE ${whereSql}
      GROUP BY s.id
      ORDER BY s.entry_date ASC, s.created_at ASC${lockingSql}
    `,
    params
  );

  return rows.map(mapSlipSummary);
}

async function listPartyPayments(executor, partyView, partyName) {
  return executor(
    `
      SELECT
        p.id,
        p.payment_date AS paymentDate,
        p.amount,
        p.bank_account AS bankAccount,
        p.mode,
        p.reference_code AS referenceCode,
        p.remark,
        COALESCE(SUM(pa.allocated_amount), 0) AS allocatedAmount
      FROM payments p
      LEFT JOIN payment_allocations pa ON pa.payment_id = p.id
      WHERE p.party_view = ? AND p.party_name = ?
      GROUP BY p.id
      ORDER BY p.payment_date DESC, p.id DESC
    `,
    [partyView, partyName]
  );
}

function buildPartySummary(partyView, partyName, slips, payments) {
  const orderCount = slips.length;
  const totalAmount = slips.reduce((sum, slip) => sum + slip.totalAmount, 0);
  const paidAmount = slips.reduce((sum, slip) => sum + slip.paidAmount, 0);
  const balanceAmount = slips.reduce((sum, slip) => sum + slip.balanceAmount, 0);
  const totalBags = slips.reduce((sum, slip) => sum + slip.totalBags, 0);
  const totalWeight = slips.reduce((sum, slip) => sum + slip.netWeight, 0);
  const openOrderCount = slips.filter((slip) => slip.balanceAmount > 0).length;
  const paymentTotal = payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0);
  const allocatedPaymentAmount = payments.reduce((sum, payment) => sum + toNumber(payment.allocatedAmount), 0);
  const advanceAmount = slips.reduce((sum, slip) => sum + slip.advancePayment, 0);
  const firstOrderDate = slips[0]?.entryDate || null;
  const lastOrderDate = slips[slips.length - 1]?.entryDate || null;
  const lastPaymentDate = payments[0]?.paymentDate || null;
  const creditAmount = Math.max(advanceAmount + paymentTotal - totalAmount, 0);

  return {
    partyView,
    partyName,
    moduleType: getModuleTypeForPartyView(partyView),
    orderCount,
    openOrderCount,
    totalBags,
    totalWeight,
    totalAmount,
    paidAmount,
    balanceAmount,
    paymentOnlyAmount: paymentTotal,
    allocatedPaymentAmount,
    advanceAmount,
    creditAmount,
    firstOrderDate,
    lastOrderDate,
    lastPaymentDate,
  };
}

async function getPartyLedger(executor, partyView, partyName) {
  const slips = await listPartySlips(executor, partyView, partyName);
  const payments = await listPartyPayments(executor, partyView, partyName);
  return {
    ...buildPartySummary(partyView, partyName, slips, payments),
    slips,
    payments,
  };
}

async function listPartyLedgers(filters = {}) {
  const moduleType = getModuleTypeForPartyView(filters.partyView);
  if (!moduleType) {
    return [];
  }

  const params = [moduleType];
  const searchClauses = ['s.module_type = ?'];

  if (filters.slipId) {
    searchClauses.push('s.id = ?');
    params.push(filters.slipId);
  }

  if (filters.search) {
    const like = `%${filters.search}%`;
    searchClauses.push(`(
      s.slip_number LIKE ? OR
      s.vehicle_number LIKE ? OR
      ${getPartyNameExpression('s')} LIKE ?
    )`);
    params.push(like, like, like);
  }

  return query(
    `
      SELECT
        ${getPartyNameExpression('s')} AS partyName,
        '${filters.partyView}' AS partyView,
        s.module_type AS moduleType,
        COUNT(*) AS orderCount,
        COALESCE(SUM(CASE WHEN COALESCE(v.balance_amount, 0) > 0 THEN 1 ELSE 0 END), 0) AS openOrderCount,
        COALESCE(SUM(s.total_bags), 0) AS totalBags,
        COALESCE(SUM(s.net_weight), 0) AS totalWeight,
        COALESCE(SUM(s.final_payable + s.advance_payment), 0) AS totalAmount,
        COALESCE(SUM(v.paid_amount), 0) AS paidAmount,
        COALESCE(SUM(v.balance_amount), 0) AS balanceAmount,
        MIN(s.entry_date) AS firstOrderDate,
        MAX(s.entry_date) AS lastOrderDate,
        payments.lastPaymentDate AS lastPaymentDate,
        payments.paymentOnlyAmount AS paymentOnlyAmount,
        payments.allocatedPaymentAmount AS allocatedPaymentAmount
      FROM slips s
      LEFT JOIN vw_slip_payment_summary v ON v.slip_id = s.id
      LEFT JOIN (
        SELECT
          p.party_view AS partyView,
          p.party_name AS partyName,
          MAX(p.payment_date) AS lastPaymentDate,
          COALESCE(SUM(p.amount), 0) AS paymentOnlyAmount,
          COALESCE(SUM(alloc.allocatedAmount), 0) AS allocatedPaymentAmount
        FROM payments p
        LEFT JOIN (
          SELECT payment_id AS paymentId, COALESCE(SUM(allocated_amount), 0) AS allocatedAmount
          FROM payment_allocations
          GROUP BY payment_id
        ) alloc ON alloc.paymentId = p.id
        GROUP BY p.party_view, p.party_name
      ) payments
        ON payments.partyView = ?
       AND payments.partyName = ${getPartyNameExpression('s')}
      WHERE ${searchClauses.join(' AND ')}
        AND ${getPartyNameExpression('s')} IS NOT NULL
        AND TRIM(${getPartyNameExpression('s')}) <> ''
      GROUP BY ${getPartyNameExpression('s')}, s.module_type, payments.lastPaymentDate, payments.paymentOnlyAmount, payments.allocatedPaymentAmount
      ORDER BY MAX(s.entry_date) DESC, ${getPartyNameExpression('s')} ASC
    `,
    [filters.partyView, ...params]
  );
}

async function findPaymentByReferenceCode(executor, referenceCode) {
  const rows = await executor(
    'SELECT id FROM payments WHERE reference_code = ? LIMIT 1',
    [referenceCode]
  );

  return rows[0] || null;
}


async function findExistingPaymentForCreate(connection, payload) {
  const [rows] = await connection.execute(
    `
      SELECT id
      FROM payments
      WHERE party_view = ?
        AND party_name = ?
        AND payment_date = ?
        AND amount = ?
        AND bank_account = ?
        AND mode = ?
        AND reference_code = ?
      LIMIT 1
    `,
    [
      payload.partyView,
      payload.partyName,
      payload.paymentDate,
      payload.amount,
      payload.bankAccount,
      payload.mode,
      payload.referenceCode,
    ]
  );

  return rows[0] || null;
}

async function createPartyPayment(connection, payload) {
  const slips = await listPartySlips(
    (sql, params) => connection.execute(sql, params).then(([rows]) => rows),
    payload.partyView,
    payload.partyName,
    { forUpdate: true }
  );

  if (!slips.length) {
    return null;
  }

  const existingPayment = await findExistingPaymentForCreate(connection, payload);
  if (existingPayment) {
    return existingPayment.id;
  }

  const referenceConflict = await findPaymentByReferenceCode(
    (sql, params) => connection.execute(sql, params).then(([rows]) => rows),
    payload.referenceCode
  );

  if (referenceConflict) {
    throw new AppError('Reference number already exists for another payment', 400);
  }

  const [result] = await connection.execute(
    `
      INSERT INTO payments (
        slip_id,
        party_view,
        party_name,
        payment_date,
        amount,
        bank_account,
        mode,
        reference_code,
        remark
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      null,
      payload.partyView,
      payload.partyName,
      payload.paymentDate,
      payload.amount,
      payload.bankAccount,
      payload.mode,
      payload.referenceCode,
      payload.remark || null,
    ]
  );

  let remainingAmount = toNumber(payload.amount);

  for (const slip of slips) {
    if (remainingAmount <= 0) break;
    if (slip.balanceAmount <= 0) continue;

    const allocationAmount = Math.min(remainingAmount, slip.balanceAmount);
    await connection.execute(
      `
        INSERT INTO payment_allocations (payment_id, slip_id, allocated_amount)
        VALUES (?, ?, ?)
      `,
      [result.insertId, slip.id, allocationAmount]
    );
    remainingAmount -= allocationAmount;
  }

  return result.insertId;
}

module.exports = {
  getModuleTypeForPartyView,
  getPartyNameExpression,
  getPartyLedger,
  listPartyLedgers,
  listPartyPayments,
  listPartySlips,
  findPaymentByReferenceCode,
  findExistingPaymentForCreate,
  createPartyPayment,
};
