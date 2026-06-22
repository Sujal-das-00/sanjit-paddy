const { query } = require('../config/database');
const { toNumber } = require('../utils/number');
const { getPartyNameExpression } = require('./paymentLedgerModel');

function buildReportWhere(filters = {}) {
  const clauses = ['1 = 1'];
  const params = [];

  if (filters.partyView === 'farmers') {
    clauses.push("s.module_type = 'home'");
  }

  if (filters.partyView === 'suppliers') {
    clauses.push("s.module_type = 'godown'");
  }

  if (filters.partyView === 'company') {
    clauses.push("s.module_type = 'selling'");
  }

  if (filters.partyName) {
    clauses.push(`${getPartyNameExpression('s')} = ?`);
    params.push(filters.partyName);
  }

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
      ${getPartyNameExpression('s')} LIKE ?
    )`);
    const like = `%${filters.search}%`;
    params.push(like, like, like);
  }

  return { whereSql: clauses.join(' AND '), params };
}

async function listReports(filters = {}) {
  const { whereSql, params } = buildReportWhere(filters);
  return query(
    `
      SELECT
        s.id,
        s.module_type AS moduleType,
        s.entry_date AS entryDate,
        s.slip_number AS slipNumber,
        s.vehicle_number AS vehicleNumber,
        s.total_bags AS totalBags,
        s.net_weight AS netWeight,
        s.purchase_total AS purchaseTotal,
        s.loading_discount AS loadingDiscount,
        s.advance_payment AS advancePayment,
        s.final_payable AS finalPayable,
        s.purchase_total - s.loading_discount AS reportAmount,
        ${getPartyNameExpression('s')} AS partyName
      FROM slips s
      WHERE ${whereSql}
      ORDER BY s.entry_date DESC, s.created_at DESC
    `,
    params
  );
}

async function getPartySummary(filters) {
  const { whereSql, params } = buildReportWhere(filters);
  const [summary] = await query(
    `
      SELECT
        COUNT(*) AS slipCount,
        COALESCE(SUM(s.total_bags), 0) AS totalBags,
        COALESCE(SUM(s.net_weight), 0) AS totalWeight,
        COALESCE(SUM(s.purchase_total - s.loading_discount), 0) AS totalAmount,
        MIN(s.entry_date) AS fromDate,
        MAX(s.entry_date) AS toDate,
        MAX(${getPartyNameExpression('s')}) AS partyName
      FROM slips s
      WHERE ${whereSql}
    `,
    params
  );

  const items = await listReports(filters);
  return { ...summary, items };
}

async function getSlipReport(slipId) {
  const slipRows = await query(
    `
      SELECT
        s.*,
        s.purchase_total - s.loading_discount AS reportAmount,
        COALESCE(v.paid_amount, 0) AS paidAmount,
        COALESCE(v.balance_amount, 0) AS balanceAmount
      FROM slips s
      LEFT JOIN vw_slip_payment_summary v ON v.slip_id = s.id
      WHERE s.id = ?
    `,
    [slipId]
  );

  if (!slipRows.length) return null;

  const itemRows = await query('SELECT * FROM slip_items WHERE slip_id = ? ORDER BY id ASC', [slipId]);
  return { ...slipRows[0], items: itemRows };
}

function buildPartyWhere(filters = {}, dateColumn = 's.entry_date') {
  const clauses = ['1 = 1'];
  const params = [];

  if (filters.partyView === 'farmers') {
    clauses.push("s.module_type = 'home'");
  }

  if (filters.partyView === 'suppliers') {
    clauses.push("s.module_type = 'godown'");
  }

  if (filters.partyView === 'company') {
    clauses.push("s.module_type = 'selling'");
  }

  if (filters.partyName) {
    clauses.push(`${getPartyNameExpression('s')} = ?`);
    params.push(filters.partyName);
  }

  if (filters.dateFrom) {
    clauses.push(`${dateColumn} >= ?`);
    params.push(filters.dateFrom);
  }

  if (filters.dateTo) {
    clauses.push(`${dateColumn} <= ?`);
    params.push(filters.dateTo);
  }

  return { whereSql: clauses.join(' AND '), params };
}

async function getPartyPurchaseRows(filters) {
  const { whereSql, params } = buildPartyWhere(filters, 's.entry_date');
  return query(
    `
      SELECT
        s.id AS slipId,
        s.entry_date AS entryDate,
        s.slip_number AS slipNumber,
        s.vehicle_number AS vehicleNumber,
        s.gross_weight AS grossWeight,
        s.dust_deduction AS dustDeduction,
        s.moisture_deduction AS moistureDeduction,
        s.net_weight AS netWeight,
        s.total_bags AS totalBags,
        s.loading_discount AS loadingDiscount,
        s.advance_payment AS advancePayment,
        s.final_payable AS finalPayable,
        COALESCE(v.paid_amount, 0) AS paidAmount,
        COALESCE(v.balance_amount, 0) AS outstanding,
        s.purchase_total - s.loading_discount AS reportAmount,
        GROUP_CONCAT(
          CONCAT(si.rice_type_name_snapshot, ': ', si.bag_count, ' bags / ', si.total_weight, 'kg @ Rs', si.rate_per_kg, '/kg')
          SEPARATOR '; '
        ) AS itemSummary
      FROM slips s
      LEFT JOIN slip_items si ON si.slip_id = s.id
      LEFT JOIN vw_slip_payment_summary v ON v.slip_id = s.id
      WHERE ${whereSql}
      GROUP BY s.id, v.paid_amount, v.balance_amount
      ORDER BY s.entry_date ASC, s.created_at ASC
    `,
    params
  );
}

async function getPartyPaymentRows(filters) {
  const clauses = ['p.party_view = ?', 'p.party_name = ?'];
  const params = [filters.partyView, filters.partyName];

  if (filters.dateFrom) {
    clauses.push('p.payment_date >= ?');
    params.push(filters.dateFrom);
  }

  if (filters.dateTo) {
    clauses.push('p.payment_date <= ?');
    params.push(filters.dateTo);
  }

  return query(
    `
      SELECT
        p.payment_date AS paymentDate,
        p.amount,
        p.bank_account AS bankAccount,
        p.mode,
        p.reference_code AS referenceCode,
        p.remark
      FROM payments p
      WHERE ${clauses.join(' AND ')}
      ORDER BY p.payment_date ASC, p.id ASC
    `,
    params
  );
}

async function getPartyStatement(filters) {
  const purchaseRows = await getPartyPurchaseRows(filters);
  const paymentRows = await getPartyPaymentRows(filters);

  let totalBuyAmount = 0;
  let totalPaidAmount = 0;
  let totalPendingAmount = 0;

  const advanceRows = purchaseRows
    .filter((row) => toNumber(row.advancePayment) > 0)
    .map((row) => ({
      paymentDate: row.entryDate,
      amount: toNumber(row.advancePayment),
      mode: 'advance',
      bankAccount: null,
      referenceCode: row.slipNumber,
      remark: null,
    }));

  const paymentHistoryRows = [...advanceRows, ...paymentRows].sort((left, right) => {
    if (left.paymentDate === right.paymentDate) return 0;
    return left.paymentDate < right.paymentDate ? -1 : 1;
  });

  const rows = purchaseRows.map((row, index) => {
    const amount = toNumber(row.reportAmount);

    const particulars = [
      `Net Wt: ${toNumber(row.netWeight)}kg`,
      `Dust: ${toNumber(row.dustDeduction)}kg`,
      `Moisture: ${toNumber(row.moistureDeduction)}kg`,
      `Bags: ${row.totalBags || 0}`,
    ];
    if (row.itemSummary) particulars.push(row.itemSummary);

    totalBuyAmount += amount;
    totalPaidAmount += toNumber(row.paidAmount);
    totalPendingAmount += toNumber(row.outstanding);

    return {
      slNo: index + 1,
      date: row.entryDate,
      reference: row.vehicleNumber || row.slipNumber || '-',
      slipNumber: row.slipNumber,
      particulars: particulars.join(' | '),
      amount,
    };
  });

  const payments = paymentHistoryRows.map((payment, index) => {
    const mode = String(payment.mode || '').trim();
    const isAdvance = mode.toLowerCase() === 'advance';
    const reference = isAdvance
      ? 'Advance Payment'
      : String(payment.referenceCode || '').trim() || `${mode || 'Payment'} Payment`;

    return {
      slNo: index + 1,
      date: payment.paymentDate,
      mode: isAdvance ? 'Advance' : mode || '-',
      reference,
      amount: toNumber(payment.amount),
    };
  });

  return {
    partyName: filters.partyName,
    partyView: filters.partyView,
    dateFrom: filters.dateFrom || null,
    dateTo: filters.dateTo || null,
    rows,
    payments,
    totals: {
      totalBuyAmount,
      totalPaidAmount,
      totalPendingAmount,
      paymentHistoryCount: paymentHistoryRows.length,
    },
  };
}

module.exports = { listReports, getPartySummary, getSlipReport, getPartyStatement };
