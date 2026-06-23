const express = require('express');
const settingsController = require('../controllers/settingsController');

const settingsRouter = express.Router();

settingsRouter.get('/rice-types', settingsController.listRiceTypes);
settingsRouter.post('/rice-types', settingsController.createRiceType);
settingsRouter.put('/rice-types/:id', settingsController.updateRiceType);
settingsRouter.delete('/rice-types/:id', settingsController.deleteRiceType);
settingsRouter.get('/farmers', settingsController.listFarmers);
settingsRouter.post('/farmers', settingsController.createFarmer);
settingsRouter.get('/suppliers', settingsController.listSuppliers);
settingsRouter.post('/suppliers', settingsController.createSupplier);
settingsRouter.put('/suppliers/:id', settingsController.updateSupplier);
settingsRouter.delete('/suppliers/:id', settingsController.deleteSupplier);
settingsRouter.get('/drivers', settingsController.listDrivers);
settingsRouter.post('/drivers', settingsController.createDriver);
settingsRouter.put('/drivers/:id', settingsController.updateDriver);
settingsRouter.delete('/drivers/:id', settingsController.deleteDriver);
settingsRouter.get('/companies', settingsController.listCompanies);
settingsRouter.post('/companies', settingsController.createCompany);
settingsRouter.put('/companies/:id', settingsController.updateCompany);
settingsRouter.delete('/companies/:id', settingsController.deleteCompany);

module.exports = { settingsRouter };
settingsRouter.post('/password', settingsController.changePassword);
