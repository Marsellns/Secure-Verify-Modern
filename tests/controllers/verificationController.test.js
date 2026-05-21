/**
 * Unit tests for Verification Controller
 * Tests product verification with and without HMAC signatures
 */

process.env.HMAC_SECRET = 'test_hmac_secret_key';

jest.mock('../../src/models/db', () => ({
  dbRun: jest.fn().mockResolvedValue({ insertId: 1, affectedRows: 1 }),
  dbGet: jest.fn(),
  dbAll: jest.fn(),
}));

const verificationController = require('../../src/controllers/verificationController');
const { dbRun, dbGet } = require('../../src/models/db');
const { generateSignature } = require('../../src/services/hmacService');

function createMocks(body = {}, user = null) {
  return {
    req: { body, ip: '127.0.0.1', user },
    res: {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    },
  };
}

describe('Verification Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyProduct', () => {
    it('should return invalid if product not found', async () => {
      dbGet.mockResolvedValue(null);
      const { req, res } = createMocks({ product_id: 'PRD-NONEXIST' });

      await verificationController.verifyProduct(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'invalid',
        message: 'Product not found in system',
      }));
      expect(dbRun).toHaveBeenCalled(); // should log the verification attempt
    });

    it('should return valid if product exists and no signature check', async () => {
      const product = {
        product_id: 'PRD-ABC123',
        product_name: 'Test Product',
        batch_number: 'B001',
        production_date: '2024-01-15',
        status: 'manufactured',
        is_suspicious: 0,
        image_url: '/images/test.png',
        supplier_id: 1,
      };
      dbGet
        .mockResolvedValueOnce(product) // product lookup
        .mockResolvedValueOnce({ supplier_name: 'Test Supplier' }); // supplier lookup

      const { req, res } = createMocks({ product_id: 'PRD-ABC123' });

      await verificationController.verifyProduct(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'valid',
        message: 'Product is authentic',
        product_name: 'Test Product',
      }));
    });

    it('should return valid if signature matches', async () => {
      const product = {
        product_id: 'PRD-SIG001',
        product_name: 'Signed Product',
        batch_number: 'B002',
        production_date: '2024-06-01',
        status: 'distributed',
        is_suspicious: 0,
        image_url: '/images/sig.png',
        supplier_id: 2,
      };

      const sigData = {
        productId: 'PRD-SIG001',
        product_name: 'Signed Product',
        batch_number: 'B002',
        production_date: '2024-06-01',
      };
      const validSig = generateSignature(sigData);

      dbGet
        .mockResolvedValueOnce(product)
        .mockResolvedValueOnce({ supplier_name: 'Sig Supplier' });

      const { req, res } = createMocks({ product_id: 'PRD-SIG001', signature: validSig });

      await verificationController.verifyProduct(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'valid',
        message: 'Product is authentic',
      }));
    });

    it('should return invalid if signature does not match', async () => {
      const product = {
        product_id: 'PRD-FAKE',
        product_name: 'Fake Product',
        batch_number: 'B003',
        production_date: '2024-03-01',
        status: 'manufactured',
        is_suspicious: 0,
        image_url: null,
        supplier_id: null,
      };

      dbGet.mockResolvedValueOnce(product);

      const { req, res } = createMocks({
        product_id: 'PRD-FAKE',
        signature: 'invalid_signature_value_that_does_not_match_at_all_1234567890',
      });

      await verificationController.verifyProduct(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'invalid',
        message: expect.stringContaining('signature does not match'),
      }));
    });

    it('should use authenticated username as checked_by when user is logged in', async () => {
      const product = {
        product_id: 'PRD-AUTH',
        product_name: 'Auth Product',
        batch_number: 'B004',
        production_date: '2024-04-01',
        status: 'manufactured',
        is_suspicious: 0,
        image_url: null,
        supplier_id: null,
      };

      dbGet
        .mockResolvedValueOnce(product)
        .mockResolvedValueOnce(null); // no supplier

      const { req, res } = createMocks(
        { product_id: 'PRD-AUTH' },
        { userId: 5, username: 'testuser', role: 'supplier' }
      );

      await verificationController.verifyProduct(req, res);

      // Check that 'testuser' was used as checked_by in the INSERT
      const insertCall = dbRun.mock.calls[0];
      expect(insertCall[1][2]).toBe('testuser');
    });

    it('should use "system" as checked_by for unauthenticated requests', async () => {
      dbGet.mockResolvedValueOnce(null); // product not found

      const { req, res } = createMocks({ product_id: 'PRD-SYS' });

      await verificationController.verifyProduct(req, res);

      const insertCall = dbRun.mock.calls[0];
      expect(insertCall[1][2]).toBe('system');
    });

    it('should handle Date object production_date during signature check', async () => {
      const product = {
        product_id: 'PRD-DATE',
        product_name: 'Date Product',
        batch_number: 'B005',
        production_date: new Date(2024, 5, 15), // June 15, 2024
        status: 'manufactured',
        is_suspicious: 0,
        image_url: null,
        supplier_id: null,
      };

      const sigData = {
        productId: 'PRD-DATE',
        product_name: 'Date Product',
        batch_number: 'B005',
        production_date: '2024-06-15',
      };
      const validSig = generateSignature(sigData);

      dbGet
        .mockResolvedValueOnce(product)
        .mockResolvedValueOnce(null);

      const { req, res } = createMocks({ product_id: 'PRD-DATE', signature: validSig });

      await verificationController.verifyProduct(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'valid',
      }));
    });

    it('should return 500 on database error', async () => {
      dbGet.mockRejectedValue(new Error('DB error'));
      const { req, res } = createMocks({ product_id: 'PRD-ERR' });

      await verificationController.verifyProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });
});
