const reportService = require('../services/reportService');
const { asyncHandler } = require('../utils/asyncHandler');

exports.listReports = asyncHandler(async (req, res) => {
  res.json({ items: await reportService.listReports(req.query) });
});

exports.getPartySummaryReport = asyncHandler(async (req, res) => {
  res.json(await reportService.getPartySummary(req.query));
});

exports.getSlipReport = asyncHandler(async (req, res) => {
  res.json(await reportService.getSlipReport(req.params.slipId));
});

exports.getPartyStatementReport = asyncHandler(async (req, res) => {
  res.json(await reportService.getPartyStatement(req.query));
});
