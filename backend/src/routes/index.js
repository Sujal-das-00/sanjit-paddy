const express = require('express');
const { dashboardRouter } = require('./dashboardRoutes');
const { settingsRouter } = require('./settingsRoutes');
const { purchasesRouter } = require('./purchaseRoutes');
const { reportsRouter } = require('./reportRoutes');
const { paymentsRouter } = require('./paymentRoutes');
const { accessRouter } = require('./accessRoutes');
const authController = require('../controllers/authController');
const { authGuard, requireAdmin } = require('../middleware/authMiddleware');

const apiRouter = express.Router();

apiRouter.post('/auth/login', authController.login);
apiRouter.post('/auth/logout', authController.logout);
apiRouter.get('/auth/me', authGuard, authController.me);
apiRouter.post('/auth/password', authGuard, authController.changePassword);

apiRouter.use(authGuard);
apiRouter.use('/dashboard', requireAdmin, dashboardRouter);
apiRouter.use('/settings', settingsRouter);
apiRouter.use('/purchases', purchasesRouter);
apiRouter.use('/reports', reportsRouter);
apiRouter.use('/payments', requireAdmin, paymentsRouter);
apiRouter.use('/access', accessRouter);

module.exports = { apiRouter };
