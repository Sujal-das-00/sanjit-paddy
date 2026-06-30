const paymentModel = require('../models/paymentModel');
const paymentLedgerModel = require('../models/paymentLedgerModel');
const settingsModel = require('../models/settingsModel');
const { AppError } = require('../utils/AppError');
const { toNumber } = require('../utils/number');

async function listPaymentOrders(filters) {
  if (!filters.partyView) {
    throw new AppError('partyView is required', 400);
  }

  return paymentModel.listPaymentOrders(filters);
}

async function getPaymentOrder(filters) {
  if (!filters.partyView) {
    throw new AppError('partyView is required', 400);
  }

  if (!filters.partyName) {
    throw new AppError('partyName is required', 400);
  }

  const record = await paymentModel.getPaymentOrder(filters);
  if (!record || !record.orderCount) {
    throw new AppError('Payment record not found', 404);
  }

  if (filters.partyView === 'suppliers') {
    record.supplierAccountNumbers = await settingsModel.listSupplierAccountNumbersByName(filters.partyName);
  }

  return record;
}

async function createPayment(payload) {
  if (!payload.partyView) {
    throw new AppError('partyView is required', 400);
  }

  if (!payload.partyName) {
    throw new AppError('partyName is required', 400);
  }

  if (!payload.paymentDate) {
    throw new AppError('Payment date is required', 400);
  }

  if (!String(payload.bankAccount || '').trim()) {
    throw new AppError('Bank account is required', 400);
  }

  if (!String(payload.mode || '').trim()) {
    throw new AppError('Payment mode is required', 400);
  }

  if (!String(payload.referenceCode || '').trim()) {
    throw new AppError('Reference number is required', 400);
  }

  if (toNumber(payload.amount) <= 0) {
    throw new AppError('Payment amount must be greater than zero', 400);
  }

  if (payload.partyView === 'suppliers') {
    const validAccounts = await settingsModel.listSupplierAccountNumbersByName(String(payload.partyName).trim());
    if (validAccounts.length && !validAccounts.includes(String(payload.bankAccount).trim())) {
      throw new AppError('Select a valid supplier account number', 400);
    }
  }

  const record = await paymentModel.getPaymentOrder({
    partyView: payload.partyView,
    partyName: payload.partyName,
  });

  if (!record || !record.orderCount) {
    throw new AppError('Party ledger not found', 404);
  }

  return paymentModel.createPayment({
    ...payload,
    partyName: String(payload.partyName).trim(),
    bankAccount: String(payload.bankAccount).trim(),
    mode: String(payload.mode).trim(),
    referenceCode: String(payload.referenceCode).trim(),
    remark: String(payload.remark || '').trim(),
    amount: toNumber(payload.amount),
  });
}

module.exports = { listPaymentOrders, getPaymentOrder, createPayment };
