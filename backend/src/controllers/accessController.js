const accessService = require('../services/accessService');
const { asyncHandler } = require('../utils/asyncHandler');

exports.getSettings = asyncHandler(async (req, res) => {
  res.json(await accessService.getAccessSettings());
});

exports.updateSettings = asyncHandler(async (req, res) => {
  res.json(await accessService.updateAccessSettings(req.body));
});

exports.listUsers = asyncHandler(async (req, res) => {
  res.json({ items: await accessService.listUsers() });
});

exports.createUser = asyncHandler(async (req, res) => {
  res.status(201).json(await accessService.createUser(req.body));
});

exports.updateUser = asyncHandler(async (req, res) => {
  res.json(await accessService.updateUser(req.authenticatedUser, req.params.id, req.body));
});

exports.resetPassword = asyncHandler(async (req, res) => {
  res.json(await accessService.resetPassword(req.params.id, req.body?.password));
});

exports.deleteUser = asyncHandler(async (req, res) => {
  res.json(await accessService.deleteUser(req.authenticatedUser, req.params.id));
});
