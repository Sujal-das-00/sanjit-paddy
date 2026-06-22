const express = require('express');
const reportController = require('../controllers/reportController');

const reportsRouter = express.Router();

reportsRouter.get('/', reportController.listReports);
reportsRouter.get('/party-summary', reportController.getPartySummaryReport);
reportsRouter.get('/party-statement', reportController.getPartyStatementReport);
reportsRouter.get('/:slipId', reportController.getSlipReport);

module.exports = { reportsRouter };
