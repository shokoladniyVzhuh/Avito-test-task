import axios from 'axios';
import { describe, expect, it } from 'vitest';
import { isRequestCanceled } from './http.ts';

describe('isRequestCanceled', () => {
  it('returns true for canceled axios requests', () => {
    expect(isRequestCanceled(new axios.CanceledError('Request canceled'))).toBe(true);
  });

  it('returns false for regular errors', () => {
    expect(isRequestCanceled(new Error('Request failed'))).toBe(false);
  });
});
