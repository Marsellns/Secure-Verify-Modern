const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, authorize } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const authController = require('../controllers/authController');

const router = express.Router();

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
};

// POST /api/auth/login
router.post('/login', authLimiter, [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required'),
], handleValidationErrors, authController.login);

// POST /api/auth/register-public
router.post('/register-public', authLimiter, [
    body('username').trim().isLength({ min: 3 }).withMessage('Username minimal 3 karakter'),
    body('password').isLength({ min: 6 }).withMessage('Password minimal 6 karakter'),
    body('role').isIn(['supplier', 'admin']).withMessage('Role tidak valid'),
], handleValidationErrors, authController.registerPublic);

// POST /api/auth/register (admin only)
router.post('/register', authenticateToken, authorize('admin'), [
    body('username').trim().isLength({ min: 3 }).withMessage('Username min 3 chars'),
    body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
    body('role').isIn(['admin', 'supplier', 'customer']).withMessage('Invalid role'),
], handleValidationErrors, authController.registerAdminOnly);

// GET /api/auth/me
router.get('/me', authenticateToken, authController.getMe);

module.exports = router;
