const express = require('express');
const paymentController = require('../controllers/paymentController');

const paymentsRouter = express.Router();

paymentsRouter.get('/', paymentController.listPaymentOrders);
paymentsRouter.get('/detail', paymentController.getPaymentOrder);
paymentsRouter.post('/', paymentController.createPayment);
paymentsRouter.put('/:id', paymentController.updatePayment);
paymentsRouter.delete('/:id', paymentController.deletePayment);

module.exports = { paymentsRouter };
