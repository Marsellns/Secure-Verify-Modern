/**
 * Unit tests for Auth Middleware
 * Tests JWT authentication, role-based authorization, and audit logging
 */

const jwt = require('jsonwebtoken');

// Set env
process.env.JWT_SECRET = 'test_jwt_secret';

// Mock the database module
jest.mock('../../src/models/db', () => ({
  dbRun: jest.fn().mockResolvedValue({ insertId: 1, affectedRows: 1 }),
  dbGet: jest.fn(),
  dbAll: jest.fn(),
}));

const { authenticateToken, authorize, logAction } = require('../../src/middleware/auth');
const { dbRun } = require('../../src/models/db');

// Helper to create mock req/res/next
function createMocks(overrides = {}) {
  const req = {
    headers: {},
    user: null,
    ...overrides,
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return { req, res, next };
}

describe('Auth Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticateToken', () => {
    it('should return 401 if no authorization header is provided', () => {
      const { req, res, next } = createMocks();

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access token required' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if authorization header has no token', () => {
      const { req, res, next } = createMocks({
        headers: { authorization: 'Bearer ' },
      });

      authenticateToken(req, res, next);

      // 'Bearer '.split(' ')[1] is '' which is falsy
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 if token is invalid', () => {
      const { req, res, next } = createMocks({
        headers: { authorization: 'Bearer invalid-token-here' },
      });

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should set req.user and call next() for a valid token', () => {
      const payload = { userId: 1, username: 'admin', role: 'admin' };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

      const { req, res, next } = createMocks({
        headers: { authorization: `Bearer ${token}` },
      });

      authenticateToken(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user.userId).toBe(1);
      expect(req.user.username).toBe('admin');
      expect(req.user.role).toBe('admin');
      expect(next).toHaveBeenCalled();
    });

    it('should return 403 for an expired token', () => {
      const payload = { userId: 1, username: 'admin', role: 'admin' };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '0s' });

      const { req, res, next } = createMocks({
        headers: { authorization: `Bearer ${token}` },
      });

      // Small delay to ensure token is expired
      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('authorize', () => {
    it('should return 401 if req.user is not set', () => {
      const { req, res, next } = createMocks();
      const middleware = authorize('admin');

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 if user role is not in allowed roles', () => {
      const { req, res, next } = createMocks({
        user: { userId: 2, username: 'supplier1', role: 'supplier' },
      });
      const middleware = authorize('admin');

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next() if user role is allowed', () => {
      const { req, res, next } = createMocks({
        user: { userId: 1, username: 'admin', role: 'admin' },
      });
      const middleware = authorize('admin', 'supplier');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should work with multiple allowed roles', () => {
      const { req, res, next } = createMocks({
        user: { userId: 3, username: 'supplier1', role: 'supplier' },
      });
      const middleware = authorize('admin', 'supplier');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('logAction', () => {
    it('should insert an audit log record', async () => {
      await logAction(1, 'LOGIN_SUCCESS', 'User logged in', '127.0.0.1');

      expect(dbRun).toHaveBeenCalledWith(
        'INSERT INTO audit_log (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
        [1, 'LOGIN_SUCCESS', 'User logged in', '127.0.0.1']
      );
    });

    it('should handle null details and ip', async () => {
      await logAction(1, 'TEST_ACTION', null, null);

      expect(dbRun).toHaveBeenCalledWith(
        'INSERT INTO audit_log (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
        [1, 'TEST_ACTION', null, null]
      );
    });

    it('should not throw if dbRun fails', async () => {
      dbRun.mockRejectedValueOnce(new Error('DB error'));

      // Should not throw
      await expect(logAction(1, 'FAIL', 'x', '0.0.0.0')).resolves.toBeUndefined();
    });
  });
});
