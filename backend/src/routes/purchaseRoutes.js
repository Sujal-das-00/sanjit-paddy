const express = require('express');
const purchaseController = require('../controllers/purchaseController');

const purchasesRouter = express.Router();

purchasesRouter.get('/godown', purchaseController.listGodownPurchases);
purchasesRouter.post('/godown', purchaseController.createGodownPurchase);
purchasesRouter.get('/home', purchaseController.listHomePurchases);
purchasesRouter.post('/home', purchaseController.createHomePurchase);
purchasesRouter.get('/selling', purchaseController.listSellingEntries);
purchasesRouter.post('/selling', purchaseController.createSellingEntry);
purchasesRouter.get('/slips/:slipId', purchaseController.getSlipById);
purchasesRouter.put('/slips/:slipId', purchaseController.updateSlipById);

module.exports = { purchasesRouter };
