const express = require('express');
const paymentController = require('../controllers/paymentController');

const paymentsRouter = express.Router();

paymentsRouter.get('/', paymentController.listPaymentOrders);
paymentsRouter.get('/detail', paymentController.getPaymentOrder);
paymentsRouter.post('/', paymentController.createPayment);

module.exports = { paymentsRouter };
