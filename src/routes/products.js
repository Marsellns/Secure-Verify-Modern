const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, authorize } = require('../middleware/auth');
const productController = require('../controllers/productController');

const router = express.Router();

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
};

// GET /api/products/catalog — Public product catalog
router.get('/catalog', productController.getCatalog);

// GET /api/products — List all products
router.get('/', authenticateToken, productController.getProducts);

// GET /api/products/:id — Single product detail (public)
router.get('/:id', productController.getProductById);

// POST /api/products — Register a new product (admin only)
router.post('/', authenticateToken, authorize('admin'), [
    body('product_name').trim().notEmpty().withMessage('Product name required'),
    body('batch_number').trim().notEmpty().withMessage('Batch number required'),
    body('production_date').trim().notEmpty().withMessage('Production date required'),
    body('supplier_id').optional({ nullable: true }).isInt().withMessage('Supplier ID must be an integer')
], handleValidationErrors, productController.createProduct);

// PUT /api/products/:id — Update a product
router.put('/:id', authenticateToken, authorize('admin', 'supplier'), [
    body('product_name').optional().trim().notEmpty().withMessage('Product name cannot be empty'),
    body('batch_number').optional().trim().notEmpty().withMessage('Batch number cannot be empty'),
    body('production_date').optional().trim().notEmpty().withMessage('Production date cannot be empty'),
    body('status').optional().trim().notEmpty().withMessage('Status cannot be empty'),
    body('supplier_id').optional({ nullable: true }).isInt().withMessage('Supplier ID must be an integer')
], handleValidationErrors, productController.updateProduct);

// DELETE /api/products/:id — Delete a product
router.delete('/:id', authenticateToken, authorize('admin'), productController.deleteProduct);

module.exports = router;
