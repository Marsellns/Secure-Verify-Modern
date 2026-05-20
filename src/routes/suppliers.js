const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, authorize } = require('../middleware/auth');
const supplierController = require('../controllers/supplierController');

const router = express.Router();

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
};

// GET /api/suppliers
router.get('/', authenticateToken, authorize('admin'), supplierController.getSuppliers);

// POST /api/suppliers
router.post('/', authenticateToken, authorize('admin'), [
    body('supplier_name').trim().notEmpty().withMessage('Supplier name is required'),
    body('contact_info').optional().trim(),
    body('address').optional().trim()
], handleValidationErrors, supplierController.createSupplier);

// PUT /api/suppliers/:id
router.put('/:id', authenticateToken, authorize('admin'), [
    body('supplier_name').optional().trim().notEmpty().withMessage('Supplier name cannot be empty'),
    body('contact_info').optional().trim(),
    body('address').optional().trim()
], handleValidationErrors, supplierController.updateSupplier);

// DELETE /api/suppliers/:id
router.delete('/:id', authenticateToken, authorize('admin'), supplierController.deleteSupplier);

module.exports = router;
