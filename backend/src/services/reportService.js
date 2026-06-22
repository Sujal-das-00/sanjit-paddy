const reportModel = require('../models/reportModel');
const { AppError } = require('../utils/AppError');

async function listReports(filters) {
  return reportModel.listReports(filters);
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

async function getSlipReport(slipId) {
  const record = await reportModel.getSlipReport(slipId);
  if (!record) {
    throw new AppError('Report not found', 404);
  }
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
