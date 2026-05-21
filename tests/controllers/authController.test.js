/**
 * Unit tests for Auth Controller
 * Tests login, registration, and user profile endpoints
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test_jwt_secret';

// Mock dependencies
jest.mock('../../src/models/db', () => ({
  dbRun: jest.fn(),
  dbGet: jest.fn(),
  dbAll: jest.fn(),
}));

jest.mock('../../src/middleware/auth', () => ({
  authenticateToken: jest.fn((req, res, next) => next()),
  authorize: jest.fn((...roles) => (req, res, next) => next()),
  logAction: jest.fn().mockResolvedValue(undefined),
}));

const authController = require('../../src/controllers/authController');
const { dbRun, dbGet } = require('../../src/models/db');
const { logAction } = require('../../src/middleware/auth');

// Helper
function createMocks(body = {}, user = null) {
  return {
    req: { body, ip: '127.0.0.1', user, params: {}, query: {} },
    res: {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    },
  };
}

describe('Auth Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return 401 if user not found', async () => {
      dbGet.mockResolvedValue(null);
      const { req, res } = createMocks({ username: 'nonexistent', password: 'pass' });

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid username or password' });
    });

    it('should return 401 if password is wrong', async () => {
      const hash = bcrypt.hashSync('correct-pass', 10);
      dbGet.mockResolvedValue({ admin_id: 1, username: 'admin', password: hash, role: 'admin', status: 'approved' });

      const { req, res } = createMocks({ username: 'admin', password: 'wrong-pass' });

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 403 if account is pending', async () => {
      const hash = bcrypt.hashSync('pass123', 10);
      dbGet.mockResolvedValue({ admin_id: 2, username: 'pending_user', password: hash, role: 'supplier', status: 'pending' });

      const { req, res } = createMocks({ username: 'pending_user', password: 'pass123' });

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 403 if account is rejected', async () => {
      const hash = bcrypt.hashSync('pass123', 10);
      dbGet.mockResolvedValue({ admin_id: 3, username: 'rejected_user', password: hash, role: 'supplier', status: 'rejected' });

      const { req, res } = createMocks({ username: 'rejected_user', password: 'pass123' });

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return token and user info on successful login', async () => {
      const hash = bcrypt.hashSync('admin123', 10);
      dbGet.mockResolvedValue({ admin_id: 1, username: 'admin', password: hash, role: 'admin', full_name: 'Super Admin', status: 'approved' });

      const { req, res } = createMocks({ username: 'admin', password: 'admin123' });

      await authController.login(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.token).toBeDefined();
      expect(responseData.user.username).toBe('admin');
      expect(responseData.user.role).toBe('admin');
    });

    it('should return 500 on database error', async () => {
      dbGet.mockRejectedValue(new Error('DB connection failed'));
      const { req, res } = createMocks({ username: 'admin', password: 'admin123' });

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  describe('registerPublic', () => {
    it('should return 409 if username already exists', async () => {
      dbGet.mockResolvedValue({ admin_id: 1 });
      const { req, res } = createMocks({ username: 'existing', password: 'pass', role: 'supplier' });

      await authController.registerPublic(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('should register new user with pending status', async () => {
      dbGet.mockResolvedValue(null);
      dbRun.mockResolvedValue({ insertId: 5, affectedRows: 1 });

      const { req, res } = createMocks({
        username: 'newuser',
        password: 'newpass123',
        role: 'supplier',
        full_name: 'New User',
      });

      await authController.registerPublic(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(dbRun).toHaveBeenCalled();
    });

    it('should return 500 on database error', async () => {
      dbGet.mockRejectedValue(new Error('DB error'));
      const { req, res } = createMocks({ username: 'u', password: 'p', role: 'r' });

      await authController.registerPublic(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('registerAdminOnly', () => {
    it('should return 409 if username already exists', async () => {
      dbGet.mockResolvedValue({ admin_id: 1 });
      const { req, res } = createMocks(
        { username: 'existing', password: 'pass', role: 'admin' },
        { userId: 1, username: 'admin', role: 'admin' }
      );

      await authController.registerAdminOnly(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('should create user with approved status', async () => {
      dbGet.mockResolvedValue(null);
      dbRun.mockResolvedValue({ insertId: 10, affectedRows: 1 });

      const { req, res } = createMocks(
        { username: 'newadmin', password: 'pass', role: 'admin', full_name: 'New Admin' },
        { userId: 1, username: 'admin', role: 'admin' }
      );

      await authController.registerAdminOnly(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const response = res.json.mock.calls[0][0];
      expect(response.userId).toBe(10);
    });

    it('should return 500 on error', async () => {
      dbGet.mockRejectedValue(new Error('err'));
      const { req, res } = createMocks(
        { username: 'u', password: 'p', role: 'r' },
        { userId: 1, username: 'admin', role: 'admin' }
      );

      await authController.registerAdminOnly(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getMe', () => {
    it('should return user data', async () => {
      dbGet.mockResolvedValue({ admin_id: 1, username: 'admin', full_name: 'Admin', role: 'admin', created_at: '2024-01-01' });
      const { req, res } = createMocks({}, { userId: 1 });

      await authController.getMe(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ username: 'admin' }));
    });

    it('should return 404 if user not found', async () => {
      dbGet.mockResolvedValue(null);
      const { req, res } = createMocks({}, { userId: 999 });

      await authController.getMe(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on error', async () => {
      dbGet.mockRejectedValue(new Error('err'));
      const { req, res } = createMocks({}, { userId: 1 });

      await authController.getMe(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
