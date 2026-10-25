const purchaseModel = require('../models/purchaseModel');
const { AppError } = require('../utils/AppError');
const { MODULE_TYPES } = require('../config/constants');
const { toNumber, toInteger } = require('../utils/number');
const accessService = require('./accessService');

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

function isOwnSlip(slip, user) {
  return slip.created_by !== null && slip.created_by !== undefined && Number(slip.created_by) === Number(user.id);
}

// Staff can only reach slips they created themselves. Answer 404 rather than
// 403 so staff cannot probe which slip ids exist.
function assertCanViewSlip(slip, user) {
  if (!slip || (!accessService.isAdmin(user) && !isOwnSlip(slip, user))) {
    throw new AppError('Slip not found', 404);
  }
}

async function assertCanEditSlip(slip, user) {
  assertCanViewSlip(slip, user);
  if (accessService.isAdmin(user)) return;

  const { staffCanEdit } = await accessService.getAccessSettings();
  if (!staffCanEdit) {
    throw new AppError('Editing entries is turned off for staff. Ask the admin to enable it.', 403);
  }
  if (slip.module_type !== MODULE_TYPES.GODOWN) {
    throw new AppError('Staff can only edit godown entries', 403);
  }
}

function scopeFiltersToUser(filters = {}, user) {
  if (accessService.isAdmin(user)) return { ...filters };
  return { ...filters, createdBy: user.id };
}

async function listSlips(moduleType, filters, user) {
  return purchaseModel.listSlips(moduleType, scopeFiltersToUser(filters, user));
}

async function createSlip(moduleType, payload, user) {
  const normalized = normalizeSlipPayload(moduleType, payload);

  // Saving an existing slip number overwrites that slip, which would let staff
  // bypass the edit switch (or overwrite someone else's entry).
  if (!accessService.isAdmin(user)) {
    const existing = await purchaseModel.findSlipByNumber(moduleType, normalized.slipNumber);
    if (existing) {
      throw new AppError(`Weight number ${normalized.slipNumber} already exists. Use a different number.`, 409);
    }
  }

  return purchaseModel.createSlip({ ...normalized, createdBy: user.id });
}

async function getSlipById(slipId, user) {
  const record = await purchaseModel.getSlipById(slipId);
  assertCanViewSlip(record, user);
  return record;
}

async function updateSlipById(slipId, payload, user) {
  const current = await purchaseModel.getSlipHeaderById(slipId);
  await assertCanEditSlip(current, user);

  const normalized = normalizeSlipPayload(current.module_type || current.moduleType, payload);
  return purchaseModel.updateSlipById(slipId, normalized);
}

async function deleteSlipById(slipId) {
  const deleted = await purchaseModel.deleteSlipById(slipId);
  if (!deleted) {
    throw new AppError('Slip not found', 404);
  }
  return deleted;
}

module.exports = {
  listSlips,
  createSlip,
  getSlipById,
  updateSlipById,
  deleteSlipById,
  assertCanViewSlip,
  scopeFiltersToUser,
};
