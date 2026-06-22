const express = require('express');
const dashboardController = require('../controllers/dashboardController');

const dashboardRouter = express.Router();

dashboardRouter.get('/summary', dashboardController.getSummary);
dashboardRouter.get('/recent-transactions', dashboardController.getRecentTransactions);

module.exports = { dashboardRouter };
