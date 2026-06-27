const purchaseModel = require('../models/purchaseModel');
const { AppError } = require('../utils/AppError');
const { MODULE_TYPES } = require('../config/constants');
const { toNumber, toInteger } = require('../utils/number');

function validateSlipPayload(moduleType, payload) {
  if (!payload || !String(payload.slipNumber || '').trim()) {
    throw new AppError('Slip number is required', 400);
  }

  if (!(payload.entryDate || payload.date)) {
    throw new AppError('Entry date is required', 400);
  }

  if (!Array.isArray(payload.entries) || !payload.entries.length) {
    throw new AppError('At least one slip item is required', 400);
  }

  if (moduleType === MODULE_TYPES.GODOWN && !String(payload.supplierName || '').trim()) {
    throw new AppError('Supplier name is required for godown purchase', 400);
  }

  if (moduleType === MODULE_TYPES.HOME && !String(payload.farmerName || '').trim()) {
    throw new AppError('Farmer name is required for home purchase', 400);
  }

  if (moduleType === MODULE_TYPES.SELLING && !String(payload.companyName || '').trim()) {
    throw new AppError('Company name is required for selling', 400);
  }
}

function normalizeEntries(entries, moduleType) {
  return entries.map((entry) => {
    const totalWeight = toNumber(entry.weight);
    const moistureDeduction = toNumber(entry.moistureDeduction);
    const netWeight = toNumber(entry.netWeight ?? Math.max(0, totalWeight - moistureDeduction));

    return {
      riceTypeName: String(entry.type || '').trim(),
      bagCount: toInteger(entry.bags),
      weightPerBag: moduleType === MODULE_TYPES.HOME ? toNumber(entry.weightPerBag) : 0,
      totalWeight,
      moisturePer1000: toNumber(entry.moisturePer1000),
      moistureDeduction,
      netWeight,
      ratePerKg: toNumber(entry.rate),
      totalAmount: toNumber(entry.amount),
    };
  });
}

function normalizeSlipPayload(moduleType, payload) {
  validateSlipPayload(moduleType, payload);

  return {
    moduleType,
    slipNumber: String(payload.slipNumber).trim(),
    entryDate: payload.entryDate || payload.date,
    vehicleNumber: String(payload.vehicleNumber || '').trim().toUpperCase(),
    farmerName: String(payload.farmerName || '').trim(),
    supplierName: String(payload.supplierName || '').trim(),
    companyName: String(payload.companyName || '').trim(),
    driverName: String(payload.driverName || '').trim(),
    grossWeight: toNumber(payload.grossWeight),
    dustDeduction: toNumber(payload.dustDeduction),
    moistureDeduction: toNumber(payload.moistureDeduction),
    finalWeight: toNumber(payload.finalWeight ?? payload.totalWeight),
    netWeight: toNumber(payload.netWeight ?? payload.finalWeight ?? payload.totalWeight),
    totalBags: toInteger(payload.totalBags),
    averageWeight: toNumber(payload.averageWeight),
    moistureNote: String(payload.moistureNote || '').trim(),
    loadingDiscount: toNumber(payload.loadingDiscount),
    advancePayment: toNumber(payload.advancePayment),
    purchaseTotal: toNumber(payload.purchaseTotal),
    finalPayable: toNumber(payload.finalPayable),
    entries: normalizeEntries(payload.entries, moduleType),
  };
}

async function listSlips(moduleType, filters) {
  return purchaseModel.listSlips(moduleType, filters);
}

async function createSlip(moduleType, payload) {
  const normalized = normalizeSlipPayload(moduleType, payload);
  return purchaseModel.createSlip(normalized);
}

async function getSlipById(slipId) {
  const record = await purchaseModel.getSlipById(slipId);
  if (!record) {
    throw new AppError('Slip not found', 404);
  }
  return record;
}

async function updateSlipById(slipId, payload) {
  const current = await purchaseModel.getSlipHeaderById(slipId);
  if (!current) {
    throw new AppError('Slip not found', 404);
  }

  const normalized = normalizeSlipPayload(current.module_type || current.moduleType, payload);
  return purchaseModel.updateSlipById(slipId, normalized);
}

module.exports = {
  listSlips,
  createSlip,
  getSlipById,
  updateSlipById,
};
