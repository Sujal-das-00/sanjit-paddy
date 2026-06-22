const { query, transaction } = require('../config/database');
const paymentLedgerModel = require('./paymentLedgerModel');

async function listPaymentOrders(filters = {}) {
  return paymentLedgerModel.listPartyLedgers(filters);
}

async function getPaymentOrder(filters = {}) {
  if (!filters.partyView || !filters.partyName) {
    return null;
  }

  return paymentLedgerModel.getPartyLedger(query, filters.partyView, filters.partyName);
}

async function createPayment(payload) {
  return transaction(async (connection) => {
    const paymentId = await paymentLedgerModel.createPartyPayment(connection, payload);
    if (!paymentId) return null;

    return paymentLedgerModel.getPartyLedger(
      (sql, params) => connection.execute(sql, params).then(([rows]) => rows),
      payload.partyView,
      payload.partyName
    );
  });
}

module.exports = { listPaymentOrders, getPaymentOrder, createPayment };
