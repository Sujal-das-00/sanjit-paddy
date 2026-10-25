const reportModel = require('../models/reportModel');
const { AppError } = require('../utils/AppError');
const { assertCanViewSlip, scopeFiltersToUser } = require('./purchaseService');

async function listReports(filters, user) {
  return reportModel.listReports(scopeFiltersToUser(filters, user));
}

async function getPartySummary(filters) {
  if (!filters.partyView) {
    throw new AppError('partyView is required', 400);
  }
  if (!filters.partyName) {
    throw new AppError('partyName is required', 400);
  }
  return reportModel.getPartySummary(filters);
}

async function getSlipReport(slipId, user) {
  const record = await reportModel.getSlipReport(slipId);
  if (!record) {
    throw new AppError('Report not found', 404);
  }
  assertCanViewSlip(record, user);
  return record;
}

async function getPartyStatement(filters) {
  if (!filters.partyView) {
    throw new AppError('partyView is required', 400);
  }
  if (!filters.partyName) {
    throw new AppError('partyName is required', 400);
  }
  return reportModel.getPartyStatement(filters);
}

module.exports = { listReports, getPartySummary, getSlipReport, getPartyStatement };
