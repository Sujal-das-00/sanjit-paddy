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

async function updatePayment(paymentId, payload) {
  return transaction(async (connection) => {
    const result = await paymentLedgerModel.updatePartyPayment(connection, paymentId, payload);
    if (!result) return null;

    return paymentLedgerModel.getPartyLedger(
      (sql, params) => connection.execute(sql, params).then(([rows]) => rows),
      result.partyView,
      result.partyName
    );
  });
}

async function deletePayment(paymentId) {
  return transaction(async (connection) => {
    const result = await paymentLedgerModel.deletePartyPayment(connection, paymentId);
    if (!result) return null;

    return paymentLedgerModel.getPartyLedger(
      (sql, params) => connection.execute(sql, params).then(([rows]) => rows),
      result.partyView,
      result.partyName
    );
  });
}

module.exports = { listPaymentOrders, getPaymentOrder, createPayment, updatePayment, deletePayment };
