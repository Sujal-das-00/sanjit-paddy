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
  return settingsModel.createSupplier(payload);
}

async function listDrivers() {
  return settingsModel.listDrivers();
}

async function createDriver(payload) {
  requireName(payload, 'Driver');
  return settingsModel.createDriver(payload);
}

async function listCompanies() {
  return settingsModel.listCompanies();
}

async function createCompany(payload) {
  requireName(payload, 'Company');
  return settingsModel.createCompany(payload);
}

module.exports = {
  listRiceTypes,
  createRiceType,
  listFarmers,
  createFarmer,
  listSuppliers,
  createSupplier,
  listDrivers,
  createDriver,
  listCompanies,
  createCompany,
};
