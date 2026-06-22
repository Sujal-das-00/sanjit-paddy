const express = require('express');
const { dashboardRouter } = require('./dashboardRoutes');
const { settingsRouter } = require('./settingsRoutes');
const { purchasesRouter } = require('./purchaseRoutes');
const { reportsRouter } = require('./reportRoutes');
const { paymentsRouter } = require('./paymentRoutes');

const apiRouter = express.Router();

apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/settings', settingsRouter);
apiRouter.use('/purchases', purchasesRouter);
apiRouter.use('/reports', reportsRouter);
apiRouter.use('/payments', paymentsRouter);

module.exports = { apiRouter };
