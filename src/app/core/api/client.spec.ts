import { getRefreshToken, hasSession, restoreRestrictedToken, setTokens } from './client';
import type { TokenResponse } from './types';

const tokens = (over: Partial<TokenResponse> = {}): TokenResponse => ({
  access_token: 'access',
  refresh_token: 'refresh',
  token_type: 'bearer',
  expires_in: 900,
  password_change_required: false,
  ...over,
});

describe('client tokens', () => {
  afterEach(() => setTokens(null));

  it('guarda el refresh token de una sesión normal', () => {
    setTokens(tokens());
    expect(getRefreshToken()).toBe('refresh');
    expect(restoreRestrictedToken()).toBe(false);
  });

  it('guarda el token restringido sin refresh y lo recupera tras recargar', () => {
    setTokens(tokens({ refresh_token: null, password_change_required: true, access_token: 'restringido' }));
    expect(getRefreshToken()).toBeNull();
    expect(restoreRestrictedToken()).toBe(true);
    expect(hasSession()).toBe(true);
  });

  it('una sesión normal reemplaza al token restringido', () => {
    setTokens(tokens({ refresh_token: null, password_change_required: true }));
    setTokens(tokens());
    expect(restoreRestrictedToken()).toBe(false);
  });

  it('cerrar sesión limpia todo', () => {
    setTokens(tokens());
    setTokens(null);
    expect(getRefreshToken()).toBeNull();
    expect(hasSession()).toBe(false);
  });
});
