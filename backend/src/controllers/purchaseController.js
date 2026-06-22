const purchaseService = require('../services/purchaseService');
const { asyncHandler } = require('../utils/asyncHandler');
const { MODULE_TYPES } = require('../config/constants');

exports.listGodownPurchases = asyncHandler(async (req, res) => {
  res.json({ items: await purchaseService.listSlips(MODULE_TYPES.GODOWN, req.query) });
});

exports.createGodownPurchase = asyncHandler(async (req, res) => {
  res.status(201).json(await purchaseService.createSlip(MODULE_TYPES.GODOWN, req.body));
});

exports.listHomePurchases = asyncHandler(async (req, res) => {
  res.json({ items: await purchaseService.listSlips(MODULE_TYPES.HOME, req.query) });
});

exports.createHomePurchase = asyncHandler(async (req, res) => {
  res.status(201).json(await purchaseService.createSlip(MODULE_TYPES.HOME, req.body));
});

exports.listSellingEntries = asyncHandler(async (req, res) => {
  res.json({ items: await purchaseService.listSlips(MODULE_TYPES.SELLING, req.query) });
});

exports.createSellingEntry = asyncHandler(async (req, res) => {
  res.status(201).json(await purchaseService.createSlip(MODULE_TYPES.SELLING, req.body));
});

exports.getSlipById = asyncHandler(async (req, res) => {
  res.json(await purchaseService.getSlipById(req.params.slipId));
});

exports.updateSlipById = asyncHandler(async (req, res) => {
  res.json(await purchaseService.updateSlipById(req.params.slipId, req.body));
});
