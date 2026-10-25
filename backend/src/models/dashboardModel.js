const { query } = require('../config/database');
const { getPartyNameExpression } = require('./paymentLedgerModel');

// Per-party balance uses the same rule as the Payments ledger:
// slips' final payable (advance already deducted) minus payments recorded for that party.
// Purchases (godown + home) are money we owe; sales are money companies owe us.
// Each party is clamped at zero so an overpaid party doesn't hide what is owed to others.
async function getOutstandingByFlow() {
  const rows = await query(`
    SELECT
      ledger.flow,
      COALESCE(SUM(GREATEST(ledger.balance, 0)), 0) AS outstanding,
      COALESCE(SUM(CASE WHEN ledger.balance > 0 THEN 1 ELSE 0 END), 0) AS partyCount
    FROM (
      SELECT
        CASE WHEN s.module_type = 'selling' THEN 'receivable' ELSE 'payable' END AS flow,
        SUM(s.final_payable) - COALESCE(MAX(paid.amount), 0) AS balance
      FROM slips s
      LEFT JOIN (
        SELECT party_view, party_name, SUM(amount) AS amount
        FROM payments
        GROUP BY party_view, party_name
      ) paid
        ON paid.party_view = CASE s.module_type
             WHEN 'home' THEN 'farmers'
             WHEN 'godown' THEN 'suppliers'
             ELSE 'company'
           END
       AND paid.party_name = ${getPartyNameExpression('s')}
      WHERE ${getPartyNameExpression('s')} IS NOT NULL
      GROUP BY s.module_type, ${getPartyNameExpression('s')}
    ) ledger
    GROUP BY ledger.flow
  `);

  const result = {
    payable: { amount: 0, partyCount: 0 },
    receivable: { amount: 0, partyCount: 0 },
  };
  rows.forEach((row) => {
    result[row.flow] = { amount: Number(row.outstanding) || 0, partyCount: Number(row.partyCount) || 0 };
  });
  return result;
}

async function getDashboardSummary() {
  const [summary] = await query(`
    SELECT
      COALESCE(SUM(CASE WHEN module_type IN ('godown', 'home') AND entry_date = CURDATE() THEN purchase_total ELSE 0 END), 0) AS todaysPurchases,
      COALESCE(SUM(CASE WHEN module_type = 'selling' AND entry_date = CURDATE() THEN purchase_total ELSE 0 END), 0) AS todaysSales,
      COALESCE(SUM(CASE WHEN module_type IN ('godown', 'home') THEN total_bags ELSE 0 END), 0) AS totalBagsPurchased
    FROM slips s
  `);
  const outstanding = await getOutstandingByFlow();

  return {
    todaysPurchases: summary?.todaysPurchases || 0,
    todaysSales: summary?.todaysSales || 0,
    totalBagsPurchased: summary?.totalBagsPurchased || 0,
    payableAmount: outstanding.payable.amount,
    payablePartyCount: outstanding.payable.partyCount,
    receivableAmount: outstanding.receivable.amount,
    receivablePartyCount: outstanding.receivable.partyCount,
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
