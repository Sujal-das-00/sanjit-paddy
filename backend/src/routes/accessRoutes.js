const express = require('express');
const accessController = require('../controllers/accessController');
const { requireAdmin } = require('../middleware/authMiddleware');

const accessRouter = express.Router();

accessRouter.use(requireAdmin);
accessRouter.get('/settings', accessController.getSettings);
accessRouter.put('/settings', accessController.updateSettings);
accessRouter.get('/users', accessController.listUsers);
accessRouter.post('/users', accessController.createUser);
accessRouter.put('/users/:id', accessController.updateUser);
accessRouter.put('/users/:id/password', accessController.resetPassword);
accessRouter.delete('/users/:id', accessController.deleteUser);

module.exports = { accessRouter };
