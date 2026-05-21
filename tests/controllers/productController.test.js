/**
 * Unit tests for Product Controller
 * Tests CRUD operations for products
 */

process.env.HMAC_SECRET = 'test_hmac_secret_key';
process.env.JWT_SECRET = 'test_jwt_secret';

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

jest.mock('../../src/services/qrService', () => ({
  generateQRCode: jest.fn().mockResolvedValue('data:image/png;base64,mockQRCode'),
}));

const productController = require('../../src/controllers/productController');
const { dbRun, dbGet, dbAll } = require('../../src/models/db');

function createMocks(body = {}, params = {}, user = { userId: 1, username: 'admin', role: 'admin' }) {
  return {
    req: { body, params, ip: '127.0.0.1', user, query: {} },
    res: {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    },
  };
}

describe('Product Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCatalog', () => {
    it('should return all products', async () => {
      const products = [
        { product_id: 'PRD-1', product_name: 'Product A' },
        { product_id: 'PRD-2', product_name: 'Product B' },
      ];
      dbAll.mockResolvedValue(products);
      const { req, res } = createMocks();

      await productController.getCatalog(req, res);

      expect(res.json).toHaveBeenCalledWith(products);
    });

    it('should return 500 on error', async () => {
      dbAll.mockRejectedValue(new Error('err'));
      const { req, res } = createMocks();

      await productController.getCatalog(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('createProduct', () => {
    it('should create product successfully without supplier', async () => {
      dbRun.mockResolvedValue({ insertId: 1, affectedRows: 1 });

      const { req, res } = createMocks({
        product_name: 'New Product',
        batch_number: 'BATCH-001',
        production_date: '2024-01-01',
        description: 'A test product',
      });

      await productController.createProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const response = res.json.mock.calls[0][0];
      expect(response.product.product_name).toBe('New Product');
      expect(response.product.signature).toBeDefined();
      expect(response.product.qr_code).toBeDefined();
    });

    it('should create product with valid supplier_id', async () => {
      dbGet.mockResolvedValue({ supplier_id: 1 }); // supplier exists
      dbRun.mockResolvedValue({ insertId: 1, affectedRows: 1 });

      const { req, res } = createMocks({
        product_name: 'Supplied Product',
        batch_number: 'BATCH-002',
        production_date: '2024-02-01',
        supplier_id: 1,
      });

      await productController.createProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 if supplier_id does not exist', async () => {
      dbGet.mockResolvedValue(null); // supplier not found

      const { req, res } = createMocks({
        product_name: 'Bad Product',
        batch_number: 'BATCH-003',
        production_date: '2024-03-01',
        supplier_id: 999,
      });

      await productController.createProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on error', async () => {
      dbRun.mockRejectedValue(new Error('insert failed'));

      const { req, res } = createMocks({
        product_name: 'Err Product',
        batch_number: 'BATCH-ERR',
        production_date: '2024-01-01',
      });

      await productController.createProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getProducts', () => {
    it('should return all products', async () => {
      const products = [{ product_id: 'P1' }];
      dbAll.mockResolvedValue(products);
      const { req, res } = createMocks();

      await productController.getProducts(req, res);

      expect(res.json).toHaveBeenCalledWith(products);
    });

    it('should return 500 on error', async () => {
      dbAll.mockRejectedValue(new Error('err'));
      const { req, res } = createMocks();

      await productController.getProducts(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getProductById', () => {
    it('should return product by id', async () => {
      const product = { product_id: 'PRD-X', product_name: 'X' };
      dbGet.mockResolvedValue(product);
      const { req, res } = createMocks({}, { id: 'PRD-X' });

      await productController.getProductById(req, res);

      expect(res.json).toHaveBeenCalledWith(product);
    });

    it('should return 404 if product not found', async () => {
      dbGet.mockResolvedValue(null);
      const { req, res } = createMocks({}, { id: 'PRD-NONE' });

      await productController.getProductById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on error', async () => {
      dbGet.mockRejectedValue(new Error('err'));
      const { req, res } = createMocks({}, { id: 'PRD-ERR' });

      await productController.getProductById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateProduct', () => {
    it('should update product successfully', async () => {
      dbGet
        .mockResolvedValueOnce({ product_id: 'PRD-UPD' }) // product exists
        .mockResolvedValueOnce({ supplier_id: 1 }); // supplier exists
      dbRun.mockResolvedValue({ affectedRows: 1 });

      const { req, res } = createMocks(
        { product_name: 'Updated', supplier_id: 1 },
        { id: 'PRD-UPD' }
      );

      await productController.updateProduct(req, res);

      expect(res.json).toHaveBeenCalledWith({ message: 'Product updated successfully' });
    });

    it('should return 404 if product not found', async () => {
      dbGet.mockResolvedValue(null);
      const { req, res } = createMocks({ product_name: 'X' }, { id: 'PRD-NOPE' });

      await productController.updateProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 if supplier_id is invalid', async () => {
      dbGet
        .mockResolvedValueOnce({ product_id: 'PRD-UPD2' }) // product exists
        .mockResolvedValueOnce(null); // supplier NOT found

      const { req, res } = createMocks(
        { supplier_id: 999 },
        { id: 'PRD-UPD2' }
      );

      await productController.updateProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on error', async () => {
      dbGet.mockRejectedValue(new Error('err'));
      const { req, res } = createMocks({}, { id: 'ERR' });

      await productController.updateProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('deleteProduct', () => {
    it('should delete product successfully', async () => {
      dbGet.mockResolvedValue({ product_id: 'PRD-DEL' });
      dbRun.mockResolvedValue({ affectedRows: 1 });
      const { req, res } = createMocks({}, { id: 'PRD-DEL' });

      await productController.deleteProduct(req, res);

      expect(res.json).toHaveBeenCalledWith({ message: 'Product deleted successfully' });
    });

    it('should return 404 if product not found', async () => {
      dbGet.mockResolvedValue(null);
      const { req, res } = createMocks({}, { id: 'PRD-NOPE' });

      await productController.deleteProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on error', async () => {
      dbGet.mockRejectedValue(new Error('err'));
      const { req, res } = createMocks({}, { id: 'ERR' });

      await productController.deleteProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
