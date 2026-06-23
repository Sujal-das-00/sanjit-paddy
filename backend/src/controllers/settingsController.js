const settingsService = require('../services/settingsService');
const { asyncHandler } = require('../utils/asyncHandler');

exports.listRiceTypes = asyncHandler(async (req, res) => {
  res.json({ items: await settingsService.listRiceTypes() });
});

exports.createRiceType = asyncHandler(async (req, res) => {
  res.status(201).json(await settingsService.createRiceType(req.body));
});

exports.updateRiceType = asyncHandler(async (req, res) => {
  res.json(await settingsService.updateRiceType(req.params.id, req.body));
});

exports.deleteRiceType = asyncHandler(async (req, res) => {
  res.json(await settingsService.deleteRiceType(req.params.id));
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

exports.updateSupplier = asyncHandler(async (req, res) => {
  res.json(await settingsService.updateSupplier(req.params.id, req.body));
});

exports.deleteSupplier = asyncHandler(async (req, res) => {
  res.json(await settingsService.deleteSupplier(req.params.id));
});

exports.listDrivers = asyncHandler(async (req, res) => {
  res.json({ items: await settingsService.listDrivers() });
});

exports.createDriver = asyncHandler(async (req, res) => {
  res.status(201).json(await settingsService.createDriver(req.body));
});

exports.updateDriver = asyncHandler(async (req, res) => {
  res.json(await settingsService.updateDriver(req.params.id, req.body));
});

exports.deleteDriver = asyncHandler(async (req, res) => {
  res.json(await settingsService.deleteDriver(req.params.id));
});

exports.listCompanies = asyncHandler(async (req, res) => {
  res.json({ items: await settingsService.listCompanies() });
});

exports.createCompany = asyncHandler(async (req, res) => {
  res.status(201).json(await settingsService.createCompany(req.body));
});

exports.updateCompany = asyncHandler(async (req, res) => {
  res.json(await settingsService.updateCompany(req.params.id, req.body));
});

exports.deleteCompany = asyncHandler(async (req, res) => {
  res.json(await settingsService.deleteCompany(req.params.id));
});

exports.changePassword = asyncHandler(async (req, res) => {
  res.json(await settingsService.changePassword(req.body, req.authenticatedUser?.id));
});
