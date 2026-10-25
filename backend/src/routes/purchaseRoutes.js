const express = require('express');
const purchaseController = require('../controllers/purchaseController');
const { requireAdmin } = require('../middleware/authMiddleware');

const purchasesRouter = express.Router();

// Staff may create godown entries and work with slips they created themselves;
// ownership and the "staff can edit" switch are enforced in purchaseService.
purchasesRouter.get('/godown', purchaseController.listGodownPurchases);
purchasesRouter.post('/godown', purchaseController.createGodownPurchase);
purchasesRouter.get('/home', requireAdmin, purchaseController.listHomePurchases);
purchasesRouter.post('/home', requireAdmin, purchaseController.createHomePurchase);
purchasesRouter.get('/selling', requireAdmin, purchaseController.listSellingEntries);
purchasesRouter.post('/selling', requireAdmin, purchaseController.createSellingEntry);
purchasesRouter.get('/slips/:slipId', purchaseController.getSlipById);
purchasesRouter.put('/slips/:slipId', purchaseController.updateSlipById);
purchasesRouter.delete('/slips/:slipId', requireAdmin, purchaseController.deleteSlipById);

module.exports = { purchasesRouter };
