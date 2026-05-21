/**
 * Unit tests for HMAC Service
 * Tests HMAC-SHA256 signature generation and verification
 */

const crypto = require('crypto');

// Set env before requiring the module
process.env.HMAC_SECRET = 'test_hmac_secret_key';

const { generateSignature, verifySignature } = require('../../src/services/hmacService');

describe('HMAC Service', () => {
  describe('generateSignature', () => {
    it('should generate a hex string signature from a string input', () => {
      const data = 'test-data';
      const signature = generateSignature(data);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      // SHA-256 hex digest is always 64 characters
      expect(signature).toHaveLength(64);
    });

    it('should generate a hex string signature from an object input', () => {
      const data = { productId: 'PRD-123', name: 'Test Product' };
      const signature = generateSignature(data);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature).toHaveLength(64);
    });

    it('should produce consistent signatures for the same input', () => {
      const data = { productId: 'PRD-ABC', batch: 'B001' };
      const sig1 = generateSignature(data);
      const sig2 = generateSignature(data);

      expect(sig1).toBe(sig2);
    });

    it('should produce different signatures for different inputs', () => {
      const sig1 = generateSignature('data-1');
      const sig2 = generateSignature('data-2');

      expect(sig1).not.toBe(sig2);
    });

    it('should match a manually computed HMAC-SHA256', () => {
      const data = 'hello-world';
      const expected = crypto
        .createHmac('sha256', 'test_hmac_secret_key')
        .update(data)
        .digest('hex');

      const signature = generateSignature(data);
      expect(signature).toBe(expected);
    });
  });

  describe('verifySignature', () => {
    it('should return true for a valid signature', () => {
      const data = 'authentic-product';
      const signature = generateSignature(data);

      const result = verifySignature(data, signature);
      expect(result).toBe(true);
    });

    it('should return false for an invalid signature', () => {
      const data = 'authentic-product';
      const fakeSignature = 'a'.repeat(64);

      const result = verifySignature(data, fakeSignature);
      expect(result).toBe(false);
    });

    it('should return true for object data with matching signature', () => {
      const data = { productId: 'PRD-XYZ', name: 'Widget' };
      const signature = generateSignature(data);

      const result = verifySignature(data, signature);
      expect(result).toBe(true);
    });

    it('should throw for mismatched buffer lengths', () => {
      const data = 'test';
      const shortSig = 'abc';

      expect(() => verifySignature(data, shortSig)).toThrow();
    });
  });
});
