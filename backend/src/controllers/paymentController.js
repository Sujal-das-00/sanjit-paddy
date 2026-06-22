const paymentService = require('../services/paymentService');
const { asyncHandler } = require('../utils/asyncHandler');

exports.listPaymentOrders = asyncHandler(async (req, res) => {
  res.json({ items: await paymentService.listPaymentOrders(req.query) });
});

exports.getPaymentOrder = asyncHandler(async (req, res) => {
  res.json(await paymentService.getPaymentOrder(req.query));
});

exports.createPayment = asyncHandler(async (req, res) => {
  res.status(201).json(await paymentService.createPayment(req.body));
});
