const express = require('express');
const { body, validationResult } = require('express-validator');
const verificationController = require('../controllers/verificationController');

const router = express.Router();

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
};

// POST /api/verify — Verify a product
router.post('/', [
    body('product_id').trim().notEmpty().withMessage('Product ID required'),
], handleValidationErrors, verificationController.verifyProduct);

module.exports = router;
