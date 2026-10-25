const express = require('express');
const settingsController = require('../controllers/settingsController');
const { requireAdmin } = require('../middleware/authMiddleware');

const settingsRouter = express.Router();

// Staff need rice types and supplier names to fill in the godown entry form;
// everything else in master data is admin-only.
settingsRouter.get('/rice-types', settingsController.listRiceTypes);
settingsRouter.post('/rice-types', requireAdmin, settingsController.createRiceType);
settingsRouter.put('/rice-types/:id', requireAdmin, settingsController.updateRiceType);
settingsRouter.delete('/rice-types/:id', requireAdmin, settingsController.deleteRiceType);
settingsRouter.get('/farmers', requireAdmin, settingsController.listFarmers);
settingsRouter.post('/farmers', requireAdmin, settingsController.createFarmer);
settingsRouter.get('/suppliers', settingsController.listSuppliers);
settingsRouter.post('/suppliers', requireAdmin, settingsController.createSupplier);
settingsRouter.put('/suppliers/:id', requireAdmin, settingsController.updateSupplier);
settingsRouter.delete('/suppliers/:id', requireAdmin, settingsController.deleteSupplier);
settingsRouter.get('/drivers', requireAdmin, settingsController.listDrivers);
settingsRouter.post('/drivers', requireAdmin, settingsController.createDriver);
settingsRouter.put('/drivers/:id', requireAdmin, settingsController.updateDriver);
settingsRouter.delete('/drivers/:id', requireAdmin, settingsController.deleteDriver);
settingsRouter.get('/companies', requireAdmin, settingsController.listCompanies);
settingsRouter.post('/companies', requireAdmin, settingsController.createCompany);
settingsRouter.put('/companies/:id', requireAdmin, settingsController.updateCompany);
settingsRouter.delete('/companies/:id', requireAdmin, settingsController.deleteCompany);

module.exports = { settingsRouter };
settingsRouter.post('/password', settingsController.changePassword);
