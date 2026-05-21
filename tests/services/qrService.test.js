/**
 * Unit tests for QR Code Service
 * Tests QR code generation functionality
 */

const { generateQRCode } = require('../../src/services/qrService');

describe('QR Code Service', () => {
  describe('generateQRCode', () => {
    it('should generate a data URL from string input', async () => {
      const data = 'https://example.com/verify?id=PRD-123';
      const result = await generateQRCode(data);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^data:image\/png;base64,/);
    });

    it('should generate a data URL from object input', async () => {
      const data = { product_id: 'PRD-456', signature: 'abc123' };
      const result = await generateQRCode(data);

      expect(result).toBeDefined();
      expect(result).toMatch(/^data:image\/png;base64,/);
    });

    it('should produce consistent output for the same input', async () => {
      const data = 'consistent-test';
      const result1 = await generateQRCode(data);
      const result2 = await generateQRCode(data);

      expect(result1).toBe(result2);
    });

    it('should produce different QR codes for different data', async () => {
      const result1 = await generateQRCode('data-1');
      const result2 = await generateQRCode('data-2');

      expect(result1).not.toBe(result2);
    });

    it('should handle empty string input', async () => {
      const result = await generateQRCode('');
      expect(result).toBeDefined();
      expect(result).toMatch(/^data:image\/png;base64,/);
    });
  });
});
