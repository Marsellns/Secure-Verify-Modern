const express = require('express');
const { authenticateToken, authorize } = require('../middleware/auth');
const supplyChainController = require('../controllers/supplyChainController');

const router = express.Router();

// POST /api/supply-chain/:productId — Update product status
router.post('/:productId', authenticateToken, authorize('supplier', 'admin'), supplyChainController.updateStatus);

// GET /api/supply-chain/:productId — Get product supply chain history
router.get('/:productId', authenticateToken, supplyChainController.getHistory);

// GET /api/supply-chain — List all products with status for supply chain view
router.get('/', authenticateToken, authorize('supplier', 'admin'), supplyChainController.getList);

module.exports = router;
