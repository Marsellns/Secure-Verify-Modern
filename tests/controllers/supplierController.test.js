/**
 * Unit tests for Supplier Controller
 * Tests CRUD operations for suppliers
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

const supplierController = require('../../src/controllers/supplierController');
const { dbRun, dbGet, dbAll } = require('../../src/models/db');

function createMocks(body = {}, params = {}) {
  return {
    req: {
      body,
      params,
      ip: '127.0.0.1',
      user: { userId: 1, username: 'admin', role: 'admin' },
    },
    res: {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    },
  };
}

describe('Supplier Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSuppliers', () => {
    it('should return all suppliers', async () => {
      const suppliers = [{ supplier_id: 1, supplier_name: 'Supplier A' }];
      dbAll.mockResolvedValue(suppliers);
      const { req, res } = createMocks();

      await supplierController.getSuppliers(req, res);

      expect(res.json).toHaveBeenCalledWith(suppliers);
    });

    it('should return 500 on error', async () => {
      dbAll.mockRejectedValue(new Error('err'));
      const { req, res } = createMocks();

      await supplierController.getSuppliers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('createSupplier', () => {
    it('should create a supplier successfully', async () => {
      dbRun.mockResolvedValue({ insertId: 5, affectedRows: 1 });

      const { req, res } = createMocks({
        supplier_name: 'New Supplier',
        contact_info: 'contact@supplier.com',
        address: 'Jakarta',
      });

      await supplierController.createSupplier(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ message: 'Supplier created', supplier_id: 5 });
    });

    it('should return 500 on error', async () => {
      dbRun.mockRejectedValue(new Error('err'));
      const { req, res } = createMocks({ supplier_name: 'Fail' });

      await supplierController.createSupplier(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateSupplier', () => {
    it('should update supplier successfully', async () => {
      dbGet.mockResolvedValue({ supplier_id: 1, supplier_name: 'Old' });
      dbRun.mockResolvedValue({ affectedRows: 1 });

      const { req, res } = createMocks(
        { supplier_name: 'Updated Supplier' },
        { id: '1' }
      );

      await supplierController.updateSupplier(req, res);

      expect(res.json).toHaveBeenCalledWith({ message: 'Supplier updated' });
    });

    it('should return 404 if supplier not found', async () => {
      dbGet.mockResolvedValue(null);
      const { req, res } = createMocks({ supplier_name: 'X' }, { id: '999' });

      await supplierController.updateSupplier(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on error', async () => {
      dbGet.mockRejectedValue(new Error('err'));
      const { req, res } = createMocks({}, { id: '1' });

      await supplierController.updateSupplier(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('deleteSupplier', () => {
    it('should delete supplier successfully', async () => {
      dbGet.mockResolvedValue({ supplier_id: 1, supplier_name: 'Del Supplier' });
      dbRun.mockResolvedValue({ affectedRows: 1 });
      const { req, res } = createMocks({}, { id: '1' });

      await supplierController.deleteSupplier(req, res);

      expect(res.json).toHaveBeenCalledWith({ message: 'Supplier deleted' });
    });

    it('should return 404 if supplier not found', async () => {
      dbGet.mockResolvedValue(null);
      const { req, res } = createMocks({}, { id: '999' });

      await supplierController.deleteSupplier(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on error', async () => {
      dbGet.mockRejectedValue(new Error('err'));
      const { req, res } = createMocks({}, { id: '1' });

      await supplierController.deleteSupplier(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
