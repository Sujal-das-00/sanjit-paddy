const dashboardModel = require('../models/dashboardModel');

async function getDashboardSummary() {
  return dashboardModel.getDashboardSummary();
}

async function getRecentTransactions(limit) {
  return dashboardModel.getRecentTransactions(limit);
}

module.exports = { getDashboardSummary, getRecentTransactions };
