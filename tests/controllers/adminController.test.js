/**
 * Unit tests for Admin Controller
 * Tests user management, audit logs, and dashboard stats
 */

jest.mock('../../src/models/db', () => ({
  dbRun: jest.fn().mockResolvedValue({ insertId: 1, affectedRows: 1 }),
  dbGet: jest.fn(),
  dbAll: jest.fn(),
}));

jest.mock('../../src/middleware/auth', () => ({
  authenticateToken: jest.fn((req, res, next) => next()),
  authorize: jest.fn((...roles) => (req, res, next) => next()),
  logAction: jest.fn().mockResolvedValue(undefined),
}));

const adminController = require('../../src/controllers/adminController');
const { dbRun, dbGet, dbAll } = require('../../src/models/db');

function createMocks(body = {}, params = {}, query = {}) {
  return {
    req: {
      body,
      params,
      query,
      ip: '127.0.0.1',
      user: { userId: 1, username: 'admin', role: 'admin' },
    },
    res: {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    },
  };
}

describe('Admin Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUsers', () => {
    it('should return all users', async () => {
      const users = [{ admin_id: 1, username: 'admin' }];
      dbAll.mockResolvedValue(users);
      const { req, res } = createMocks();

      await adminController.getUsers(req, res);

      expect(res.json).toHaveBeenCalledWith(users);
    });

    it('should return 500 on error', async () => {
      dbAll.mockRejectedValue(new Error('err'));
      const { req, res } = createMocks();

      await adminController.getUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getPendingUsers', () => {
    it('should return pending users', async () => {
      const users = [{ admin_id: 5, username: 'pending1', status: 'pending' }];
      dbAll.mockResolvedValue(users);
      const { req, res } = createMocks();

      await adminController.getPendingUsers(req, res);

      expect(res.json).toHaveBeenCalledWith(users);
    });

    it('should return 500 on error', async () => {
      dbAll.mockRejectedValue(new Error('err'));
      const { req, res } = createMocks();

      await adminController.getPendingUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('approveUser', () => {
    it('should approve a pending user', async () => {
      dbGet.mockResolvedValue({ username: 'user1', role: 'supplier', status: 'pending' });
      dbRun.mockResolvedValue({ affectedRows: 1 });
      const { req, res } = createMocks({}, { id: '5' });

      await adminController.approveUser(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('berhasil di-approve'),
      }));
    });

    it('should return 404 if user not found', async () => {
      dbGet.mockResolvedValue(null);
      const { req, res } = createMocks({}, { id: '999' });

      await adminController.approveUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 if already approved', async () => {
      dbGet.mockResolvedValue({ username: 'user1', role: 'supplier', status: 'approved' });
      const { req, res } = createMocks({}, { id: '5' });

      await adminController.approveUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on error', async () => {
      dbGet.mockRejectedValue(new Error('err'));
      const { req, res } = createMocks({}, { id: '5' });

      await adminController.approveUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('rejectUser', () => {
    it('should reject a user', async () => {
      dbGet.mockResolvedValue({ username: 'user2', role: 'supplier', status: 'pending' });
      dbRun.mockResolvedValue({ affectedRows: 1 });
      const { req, res } = createMocks({}, { id: '6' });

      await adminController.rejectUser(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('ditolak'),
      }));
    });

    it('should return 404 if user not found', async () => {
      dbGet.mockResolvedValue(null);
      const { req, res } = createMocks({}, { id: '999' });

      await adminController.rejectUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 if already rejected', async () => {
      dbGet.mockResolvedValue({ username: 'user2', role: 'supplier', status: 'rejected' });
      const { req, res } = createMocks({}, { id: '6' });

      await adminController.rejectUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on error', async () => {
      dbGet.mockRejectedValue(new Error('err'));
      const { req, res } = createMocks({}, { id: '6' });

      await adminController.rejectUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      dbGet.mockResolvedValue({ username: 'deleteme' });
      dbRun.mockResolvedValue({ affectedRows: 1 });
      const { req, res } = createMocks({}, { id: '10' });

      await adminController.deleteUser(req, res);

      expect(res.json).toHaveBeenCalledWith({ message: 'User deleted successfully' });
    });

    it('should return 400 when trying to delete own account', async () => {
      const { req, res } = createMocks({}, { id: '1' }); // same as req.user.userId

      await adminController.deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Cannot delete your own account' });
    });

    it('should return 404 if user not found', async () => {
      dbGet.mockResolvedValue(null);
      const { req, res } = createMocks({}, { id: '999' });

      await adminController.deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on error', async () => {
      dbGet.mockRejectedValue(new Error('err'));
      const { req, res } = createMocks({}, { id: '10' });

      await adminController.deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getLogs', () => {
    it('should return paginated logs', async () => {
      const logs = [{ log_id: 1, action: 'LOGIN' }];
      dbAll.mockResolvedValue(logs);
      dbGet.mockResolvedValue({ count: 1 });

      const { req, res } = createMocks({}, {}, { page: '1', limit: '10' });

      await adminController.getLogs(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        logs,
        pagination: expect.objectContaining({ page: 1, limit: 10 }),
      }));
    });

    it('should use default pagination values', async () => {
      dbAll.mockResolvedValue([]);
      dbGet.mockResolvedValue({ count: 0 });
      const { req, res } = createMocks({}, {}, {});

      await adminController.getLogs(req, res);

      const result = res.json.mock.calls[0][0];
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(50);
    });

    it('should return 500 on error', async () => {
      dbAll.mockRejectedValue(new Error('err'));
      const { req, res } = createMocks();

      await adminController.getLogs(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getSuspicious', () => {
    it('should return suspicious products', async () => {
      const products = [{ product_id: 'P1', is_suspicious: 1 }];
      dbAll.mockResolvedValue(products);
      const { req, res } = createMocks();

      await adminController.getSuspicious(req, res);

      expect(res.json).toHaveBeenCalledWith(products);
    });

    it('should return 500 on error', async () => {
      dbAll.mockRejectedValue(new Error('err'));
      const { req, res } = createMocks();

      await adminController.getSuspicious(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getStats', () => {
    it('should return dashboard statistics', async () => {
      dbGet
        .mockResolvedValueOnce({ count: 10 })  // totalProducts
        .mockResolvedValueOnce({ count: 5 })   // verifiedCount
        .mockResolvedValueOnce({ count: 2 })   // suspiciousCount
        .mockResolvedValueOnce({ count: 3 });  // pendingUsers
      dbAll.mockResolvedValue([]);              // recentLogs

      const { req, res } = createMocks();

      await adminController.getStats(req, res);

      expect(res.json).toHaveBeenCalledWith({
        totalProducts: 10,
        verifiedCount: 5,
        suspiciousCount: 2,
        pendingUsers: 3,
        recentLogs: [],
      });
    });

    it('should handle null counts gracefully', async () => {
      dbGet
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      dbAll.mockResolvedValue([]);

      const { req, res } = createMocks();

      await adminController.getStats(req, res);

      expect(res.json).toHaveBeenCalledWith({
        totalProducts: 0,
        verifiedCount: 0,
        suspiciousCount: 0,
        pendingUsers: 0,
        recentLogs: [],
      });
    });

    it('should return 500 on error', async () => {
      dbGet.mockRejectedValue(new Error('err'));
      const { req, res } = createMocks();

      await adminController.getStats(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
