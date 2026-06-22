const settingsService = require('../services/settingsService');
const { asyncHandler } = require('../utils/asyncHandler');

exports.listRiceTypes = asyncHandler(async (req, res) => {
  res.json({ items: await settingsService.listRiceTypes() });
});

exports.createRiceType = asyncHandler(async (req, res) => {
  res.status(201).json(await settingsService.createRiceType(req.body));
});

exports.listFarmers = asyncHandler(async (req, res) => {
  res.json({ items: await settingsService.listFarmers() });
});

exports.createFarmer = asyncHandler(async (req, res) => {
  res.status(201).json(await settingsService.createFarmer(req.body));
});

exports.listSuppliers = asyncHandler(async (req, res) => {
  res.json({ items: await settingsService.listSuppliers() });
});

exports.createSupplier = asyncHandler(async (req, res) => {
  res.status(201).json(await settingsService.createSupplier(req.body));
});

exports.listDrivers = asyncHandler(async (req, res) => {
  res.json({ items: await settingsService.listDrivers() });
});

exports.createDriver = asyncHandler(async (req, res) => {
  res.status(201).json(await settingsService.createDriver(req.body));
});

exports.listCompanies = asyncHandler(async (req, res) => {
  res.json({ items: await settingsService.listCompanies() });
});

exports.createCompany = asyncHandler(async (req, res) => {
  res.status(201).json(await settingsService.createCompany(req.body));
});
