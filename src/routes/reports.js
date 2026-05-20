const express = require('express');
const { authenticateToken, authorize } = require('../middleware/auth');
const reportController = require('../controllers/reportController');

const router = express.Router();

// GET /api/reports
router.get('/', authenticateToken, authorize('admin'), reportController.getReports);

module.exports = router;
