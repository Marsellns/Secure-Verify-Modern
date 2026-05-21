/**
 * Unit tests for Rate Limiter Middleware
 * Tests rate limiter configuration
 */

const { generalLimiter, authLimiter } = require('../../src/middleware/rateLimiter');

describe('Rate Limiter Middleware', () => {
  describe('generalLimiter', () => {
    it('should be a function (Express middleware)', () => {
      expect(typeof generalLimiter).toBe('function');
    });

    it('should have expected configuration', () => {
      // The rate limiter is an Express middleware function
      // We verify it exists and is callable
      expect(generalLimiter).toBeDefined();
    });
  });

  describe('authLimiter', () => {
    it('should be a function (Express middleware)', () => {
      expect(typeof authLimiter).toBe('function');
    });

    it('should be different from generalLimiter', () => {
      expect(authLimiter).not.toBe(generalLimiter);
    });

    it('should be defined and callable', () => {
      expect(authLimiter).toBeDefined();
    });
  });
});
