const dashboardService = require('../services/dashboardService');
const { asyncHandler } = require('../utils/asyncHandler');

exports.getSummary = asyncHandler(async (req, res) => {
  const summary = await dashboardService.getDashboardSummary();
  res.json(summary);
});

exports.getRecentTransactions = asyncHandler(async (req, res) => {
  const records = await dashboardService.getRecentTransactions(req.query.limit);
  res.json({ items: records });
});
