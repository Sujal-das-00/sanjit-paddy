const express = require('express');
const settingsController = require('../controllers/settingsController');

const settingsRouter = express.Router();

settingsRouter.get('/rice-types', settingsController.listRiceTypes);
settingsRouter.post('/rice-types', settingsController.createRiceType);
settingsRouter.get('/farmers', settingsController.listFarmers);
settingsRouter.post('/farmers', settingsController.createFarmer);
settingsRouter.get('/suppliers', settingsController.listSuppliers);
settingsRouter.post('/suppliers', settingsController.createSupplier);
settingsRouter.get('/drivers', settingsController.listDrivers);
settingsRouter.post('/drivers', settingsController.createDriver);
settingsRouter.get('/companies', settingsController.listCompanies);
settingsRouter.post('/companies', settingsController.createCompany);

module.exports = { settingsRouter };
