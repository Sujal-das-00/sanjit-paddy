const settingsModel = require('../models/settingsModel');
const { AppError } = require('../utils/AppError');

function requireName(payload, label) {
  if (!payload || !String(payload.name || '').trim()) {
    throw new AppError(`${label} name is required`, 400);
  }
}

async function listRiceTypes() {
  return settingsModel.listRiceTypes();
}

async function createRiceType(payload) {
  requireName(payload, 'Rice type');
  return settingsModel.createRiceType(payload);
}

async function updateRiceType(id, payload) {
  requireName(payload, 'Rice type');
  return settingsModel.updateRiceType(id, payload);
}

async function deleteRiceType(id) {
  return settingsModel.deleteRiceType(id);
}

async function listFarmers() {
  return settingsModel.listFarmers();
}

async function createFarmer(payload) {
  requireName(payload, 'Farmer');
  return settingsModel.createFarmer(payload);
}

async function listSuppliers() {
  return settingsModel.listSuppliers();
}

async function createSupplier(payload) {
  requireName(payload, 'Supplier');
  payload.accountNumbers = Array.isArray(payload.accountNumbers) ? payload.accountNumbers : [];
  return settingsModel.createSupplier(payload);
}

async function updateSupplier(id, payload) {
  requireName(payload, 'Supplier');
  payload.accountNumbers = Array.isArray(payload.accountNumbers) ? payload.accountNumbers : [];
  return settingsModel.updateSupplier(id, payload);
}

async function deleteSupplier(id) {
  return settingsModel.deleteSupplier(id);
}

async function listDrivers() {
  return settingsModel.listDrivers();
}

async function createDriver(payload) {
  requireName(payload, 'Driver');
  return settingsModel.createDriver(payload);
}

async function updateDriver(id, payload) {
  requireName(payload, 'Driver');
  return settingsModel.updateDriver(id, payload);
}

async function deleteDriver(id) {
  return settingsModel.deleteDriver(id);
}

async function listCompanies() {
  return settingsModel.listCompanies();
}

async function createCompany(payload) {
  requireName(payload, 'Company');
  return settingsModel.createCompany(payload);
}

async function updateCompany(id, payload) {
  requireName(payload, 'Company');
  return settingsModel.updateCompany(id, payload);
}

async function deleteCompany(id) {
  return settingsModel.deleteCompany(id);
}

module.exports = {
  listRiceTypes,
  createRiceType,
  updateRiceType,
  deleteRiceType,
  listFarmers,
  createFarmer,
  listSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  listDrivers,
  createDriver,
  updateDriver,
  deleteDriver,
  listCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
};

async function changePassword(payload, userId) {
  const authService = require('./authService');
  if (!String(payload.currentPassword || '').trim()) {
    throw new (require('../utils/AppError').AppError)('Current password is required', 400);
  }
  if (String(payload.newPassword || '').trim().length < 4) {
    throw new (require('../utils/AppError').AppError)('New password must be at least 4 characters', 400);
  }
  return authService.changePassword(userId, payload.currentPassword, payload.newPassword);
}

module.exports.changePassword = changePassword;
