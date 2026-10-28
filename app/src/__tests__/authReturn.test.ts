import { describe, expect, it } from '@jest/globals';
import { readAuthReturn } from '../auth/authReturn';

describe('readAuthReturn', () => {
  it('takes a PKCE code', () => {
    expect(readAuthReturn('afterhours://auth-callback?code=abc')).toEqual({ kind: 'code', code: 'abc' });
  });
  it('refuses a session in the hash', () => {
    expect(readAuthReturn('afterhours://auth-callback#access_token=a&refresh_token=b')).toEqual({ kind: 'refused' });
  });
  it('refuses a code that comes with a token', () => {
    expect(readAuthReturn('afterhours://auth-callback?code=abc#access_token=a&refresh_token=b')).toEqual({ kind: 'refused' });
  });
  it('refuses a token in the query', () => {
    expect(readAuthReturn('exp://host/--/auth-callback?access_token=a&refresh_token=b')).toEqual({ kind: 'refused' });
  });
  it('reports an error from either half', () => {
    expect(readAuthReturn('afterhours://auth-callback?error=access_denied&error_description=no+thanks')).toEqual({
      kind: 'error',
      message: 'no thanks',
    });
    expect(readAuthReturn('afterhours://auth-callback#error=server_error')).toEqual({ kind: 'error', message: 'server_error' });
  });
  it('finds nothing in a bare return', () => {
    expect(readAuthReturn('afterhours://auth-callback')).toEqual({ kind: 'none' });
  });
});
