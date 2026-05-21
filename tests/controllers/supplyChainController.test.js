/**
 * Unit tests for Supply Chain Controller
 * Tests supply chain status transitions, history, and listing
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

const supplyChainController = require('../../src/controllers/supplyChainController');
const { dbRun, dbGet, dbAll } = require('../../src/models/db');

function createMocks(params = {}, user = { userId: 1, username: 'supplier1', role: 'supplier' }) {
  return {
    req: {
      body: {},
      params,
      ip: '127.0.0.1',
      user,
    },
    res: {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    },
  };
}

describe('Supply Chain Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateStatus', () => {
    it('should transition from manufactured to distributed', async () => {
      dbGet.mockResolvedValue({
        product_id: 'PRD-001',
        status: 'manufactured',
      });
      dbRun.mockResolvedValue({ affectedRows: 1 });

      const { req, res } = createMocks({ productId: 'PRD-001' });

      await supplyChainController.updateStatus(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Product status updated',
        previous_status: 'manufactured',
        new_status: 'distributed',
      }));
    });

    it('should transition from distributed to sold', async () => {
      dbGet.mockResolvedValue({
        product_id: 'PRD-002',
        status: 'distributed',
      });
      dbRun.mockResolvedValue({ affectedRows: 1 });

      const { req, res } = createMocks({ productId: 'PRD-002' });

      await supplyChainController.updateStatus(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        new_status: 'sold',
      }));
    });

    it('should return 404 if product not found', async () => {
      dbGet.mockResolvedValue(null);
      const { req, res } = createMocks({ productId: 'PRD-NONE' });

      await supplyChainController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 if no valid transition exists', async () => {
      dbGet.mockResolvedValue({
        product_id: 'PRD-003',
        status: 'sold', // no transition from 'sold'
      });

      const { req, res } = createMocks({ productId: 'PRD-003' });

      await supplyChainController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 403 if role is not allowed for transition', async () => {
      dbGet.mockResolvedValue({
        product_id: 'PRD-004',
        status: 'manufactured',
      });

      // customer role is not allowed
      const { req, res } = createMocks(
        { productId: 'PRD-004' },
        { userId: 5, username: 'customer1', role: 'customer' }
      );

      await supplyChainController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 500 on error', async () => {
      dbGet.mockRejectedValue(new Error('err'));
      const { req, res } = createMocks({ productId: 'PRD-ERR' });

      await supplyChainController.updateStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getHistory', () => {
    it('should return supply chain history', async () => {
      const history = [
        { id: 1, product_id: 'PRD-001', status: 'manufactured' },
        { id: 2, product_id: 'PRD-001', status: 'distributed' },
      ];
      dbAll.mockResolvedValue(history);
      const { req, res } = createMocks({ productId: 'PRD-001' });

      await supplyChainController.getHistory(req, res);

      expect(res.json).toHaveBeenCalledWith(history);
    });

    it('should return 404 if no records found', async () => {
      dbAll.mockResolvedValue([]);
      const { req, res } = createMocks({ productId: 'PRD-NONE' });

      await supplyChainController.getHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on error', async () => {
      dbAll.mockRejectedValue(new Error('err'));
      const { req, res } = createMocks({ productId: 'PRD-ERR' });

      await supplyChainController.getHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getList', () => {
    it('should return product list', async () => {
      const products = [{ product_id: 'P1', product_name: 'A', status: 'manufactured' }];
      dbAll.mockResolvedValue(products);
      const { req, res } = createMocks();

      await supplyChainController.getList(req, res);

      expect(res.json).toHaveBeenCalledWith(products);
    });

    it('should return 500 on error', async () => {
      dbAll.mockRejectedValue(new Error('err'));
      const { req, res } = createMocks();

      await supplyChainController.getList(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
