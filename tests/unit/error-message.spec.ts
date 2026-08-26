import { describe, expect, it } from 'vitest';
import { getErrorMessage } from '../../app/utils/error-message';

describe('getErrorMessage', () => {
  it('returns the Error message', () => {
    expect(getErrorMessage(new Error('boom'), 'fallback')).toBe('boom');
  });

  it('returns a string error as-is', () => {
    expect(getErrorMessage('nope', 'fallback')).toBe('nope');
  });

  it('returns the fallback for unknown values', () => {
    expect(getErrorMessage({ code: 1 }, 'fallback')).toBe('fallback');
    expect(getErrorMessage(null, 'fallback')).toBe('fallback');
  });

  it('joins nested FIT encoder causes', () => {
    const error = new Error('Could not write Message', {
      cause: {
        cause: {
          message: 'Could not construct MesgDefinition from Message'
        }
      }
    });

    expect(getErrorMessage(error, 'fallback')).toBe(
      'Could not write Message — Could not construct MesgDefinition from Message'
    );
  });
});
