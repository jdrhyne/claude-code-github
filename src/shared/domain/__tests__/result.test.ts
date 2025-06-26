import { describe, it, expect } from 'vitest';
import { Result } from '../result.js';

describe('Result', () => {
  describe('ok', () => {
    it('should create successful result with value', () => {
      const result = Result.ok('success');
      expect(result.isSuccess).toBe(true);
      expect(result.isFailure).toBe(false);
      expect(result.value).toBe('success');
      expect(result.error).toBeUndefined();
    });

    it('should create successful result for void', () => {
      const result = Result.ok<void>();
      expect(result.isSuccess).toBe(true);
      expect(result.isFailure).toBe(false);
      expect(result.error).toBeUndefined();
    });

    it('should create successful result with null', () => {
      const result = Result.ok(null);
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeNull();
    });
  });

  describe('fail', () => {
    it('should create failed result', () => {
      const result = Result.fail<string>('error message');
      expect(result.isSuccess).toBe(false);
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('error message');
    });

    it('should throw when accessing value on failure', () => {
      const result = Result.fail<string>('error');
      expect(() => result.value).toThrow('Cannot get value from a failure result');
    });
  });

  describe('combine', () => {
    it('should combine successful results', () => {
      const results = [
        Result.ok('a'),
        Result.ok('b'),
        Result.ok('c')
      ];
      
      const combined = Result.combine(results);
      expect(combined.isSuccess).toBe(true);
      expect(combined.value).toEqual(results);
    });

    it('should fail on first failure', () => {
      const results = [
        Result.ok('a'),
        Result.fail<string>('error'),
        Result.ok('c')
      ];
      
      const combined = Result.combine(results);
      expect(combined.isFailure).toBe(true);
      expect(combined.error).toBe('error');
    });
  });

  describe('map', () => {
    it('should map successful value', () => {
      const result = Result.ok(5);
      const mapped = result.map(x => x * 2);
      
      expect(mapped.isSuccess).toBe(true);
      expect(mapped.value).toBe(10);
    });

    it('should pass through failure', () => {
      const result = Result.fail<number>('error');
      const mapped = result.map(x => x * 2);
      
      expect(mapped.isFailure).toBe(true);
      expect(mapped.error).toBe('error');
    });
  });

  describe('flatMap', () => {
    it('should chain successful results', () => {
      const result = Result.ok(5);
      const chained = result.flatMap(x => Result.ok(x * 2));
      
      expect(chained.isSuccess).toBe(true);
      expect(chained.value).toBe(10);
    });

    it('should pass through initial failure', () => {
      const result = Result.fail<number>('error');
      const chained = result.flatMap(x => Result.ok(x * 2));
      
      expect(chained.isFailure).toBe(true);
      expect(chained.error).toBe('error');
    });

    it('should return chained failure', () => {
      const result = Result.ok(5);
      const chained = result.flatMap(x => Result.fail<number>('chained error'));
      
      expect(chained.isFailure).toBe(true);
      expect(chained.error).toBe('chained error');
    });
  });
});