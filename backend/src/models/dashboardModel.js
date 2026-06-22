const { query } = require('../config/database');

async function getDashboardSummary() {
  const [summary] = await query(`
    SELECT
      COALESCE(SUM(CASE WHEN module_type IN ('godown', 'home') AND entry_date = CURDATE() THEN purchase_total ELSE 0 END), 0) AS todaysPurchases,
      COALESCE(SUM(CASE WHEN module_type = 'selling' AND entry_date = CURDATE() THEN purchase_total ELSE 0 END), 0) AS todaysSales,
      COALESCE(SUM(v.balance_amount), 0) AS pendingPayments,
      COALESCE(SUM(CASE WHEN module_type IN ('godown', 'home') THEN total_bags ELSE 0 END), 0) AS totalBagsPurchased
    FROM slips s
    LEFT JOIN vw_slip_payment_summary v ON v.slip_id = s.id
  `);

  return summary || {
    todaysPurchases: 0,
    todaysSales: 0,
    pendingPayments: 0,
    totalBagsPurchased: 0,
  };
}

async function getRecentTransactions(limit = 10) {
  const safeLimit = Number.parseInt(limit, 10) || 10;
  return query(`
    SELECT
      s.id,
      s.entry_date AS entryDate,
      s.slip_number AS slipNumber,
      s.module_type AS moduleType,
      COALESCE(s.farmer_name_snapshot, s.supplier_name_snapshot, s.company_name_snapshot) AS partyName,
      s.total_bags AS totalBags,
      s.purchase_total AS amount,
      CASE
        WHEN COALESCE(v.balance_amount, 0) <= 0 THEN 'settled'
        WHEN COALESCE(v.paid_amount, 0) > 0 THEN 'partial'
        ELSE 'pending'
      END AS status
    FROM slips s
    LEFT JOIN vw_slip_payment_summary v ON v.slip_id = s.id
    ORDER BY s.entry_date DESC, s.created_at DESC
    LIMIT ${safeLimit}
  `);
}

module.exports = { getDashboardSummary, getRecentTransactions };
