const express = require('express');
const { authenticateToken, authorize } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

const router = express.Router();

// GET /api/admin/users — List all users
router.get('/users', authenticateToken, authorize('admin'), adminController.getUsers);

// GET /api/admin/pending-users — List pending users
router.get('/pending-users', authenticateToken, authorize('admin'), adminController.getPendingUsers);

// PUT /api/admin/users/:id/approve — Approve a pending user
router.put('/users/:id/approve', authenticateToken, authorize('admin'), adminController.approveUser);

// PUT /api/admin/users/:id/reject — Reject a pending user
router.put('/users/:id/reject', authenticateToken, authorize('admin'), adminController.rejectUser);

// DELETE /api/admin/users/:id — Delete user
router.delete('/users/:id', authenticateToken, authorize('admin'), adminController.deleteUser);

// GET /api/admin/logs — View audit logs
router.get('/logs', authenticateToken, authorize('admin'), adminController.getLogs);

// GET /api/admin/suspicious — List suspicious products
router.get('/suspicious', authenticateToken, authorize('admin'), adminController.getSuspicious);

// GET /api/admin/stats — Dashboard statistics
router.get('/stats', authenticateToken, adminController.getStats);

module.exports = router;
