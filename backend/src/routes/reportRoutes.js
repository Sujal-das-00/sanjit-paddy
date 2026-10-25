const express = require('express');
const reportController = require('../controllers/reportController');
const { requireAdmin } = require('../middleware/authMiddleware');

const reportsRouter = express.Router();

// Staff only ever see their own slips here; see reportService.
reportsRouter.get('/', reportController.listReports);
reportsRouter.get('/party-summary', requireAdmin, reportController.getPartySummaryReport);
reportsRouter.get('/party-statement', requireAdmin, reportController.getPartyStatementReport);
reportsRouter.get('/:slipId', reportController.getSlipReport);

module.exports = { reportsRouter };
