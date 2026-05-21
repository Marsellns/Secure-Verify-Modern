/**
 * Unit tests for Report Controller
 * Tests verification report generation with optional date filters
 */

jest.mock('../../src/models/db', () => ({
  dbRun: jest.fn(),
  dbGet: jest.fn(),
  dbAll: jest.fn(),
}));

const reportController = require('../../src/controllers/reportController');
const { dbGet, dbAll } = require('../../src/models/db');

function createMocks(query = {}) {
  return {
    req: {
      body: {},
      params: {},
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

describe('Report Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getReports', () => {
    it('should return report data without date filter', async () => {
      dbGet
        .mockResolvedValueOnce({ count: 100 })   // total_verifications
        .mockResolvedValueOnce({ count: 80 })    // valid_verifications
        .mockResolvedValueOnce({ count: 20 })    // invalid_verifications
        .mockResolvedValueOnce({ count: 50 })    // total_products
        .mockResolvedValueOnce({ count: 10 });   // total_suppliers
      dbAll.mockResolvedValue([]);                // history

      const { req, res } = createMocks();

      await reportController.getReports(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        totals: { total: 100, valid: 80, invalid: 20 },
        summary: { total_products: 50, total_suppliers: 10 },
        filters: { from: null, to: null },
      }));
    });

    it('should apply "from" date filter', async () => {
      dbGet
        .mockResolvedValueOnce({ count: 50 })
        .mockResolvedValueOnce({ count: 40 })
        .mockResolvedValueOnce({ count: 10 })
        .mockResolvedValueOnce({ count: 30 })
        .mockResolvedValueOnce({ count: 5 });
      dbAll.mockResolvedValue([]);

      const { req, res } = createMocks({ from: '2024-01-01' });

      await reportController.getReports(req, res);

      expect(res.json).toHaveBeenCalled();
      const result = res.json.mock.calls[0][0];
      expect(result.filters.from).toBe('2024-01-01');
    });

    it('should apply "from" and "to" date filters', async () => {
      dbGet
        .mockResolvedValueOnce({ count: 25 })
        .mockResolvedValueOnce({ count: 20 })
        .mockResolvedValueOnce({ count: 5 })
        .mockResolvedValueOnce({ count: 30 })
        .mockResolvedValueOnce({ count: 5 });
      dbAll.mockResolvedValue([]);

      const { req, res } = createMocks({ from: '2024-01-01', to: '2024-06-30' });

      await reportController.getReports(req, res);

      const result = res.json.mock.calls[0][0];
      expect(result.filters.from).toBe('2024-01-01');
      expect(result.filters.to).toBe('2024-06-30');
    });

    it('should handle null counts', async () => {
      dbGet
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      dbAll.mockResolvedValue([]);

      const { req, res } = createMocks();

      await reportController.getReports(req, res);

      const result = res.json.mock.calls[0][0];
      expect(result.totals.total).toBe(0);
      expect(result.totals.valid).toBe(0);
      expect(result.totals.invalid).toBe(0);
    });

    it('should return 500 on error', async () => {
      dbGet.mockRejectedValue(new Error('err'));
      const { req, res } = createMocks();

      await reportController.getReports(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });
});
