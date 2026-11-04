import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { authApi } from '../api/endpoints';
import { ApiError, getRefreshToken, setOnSessionExpired, setTokens } from '../api/client';
import type { Me, Role } from '../api/types';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);

  readonly me = signal<Me | null>(null);
  readonly ready = signal(false);

  readonly role = computed<Role | null>(() => this.me()?.role ?? null);
  readonly canManage = computed(() => {
    const role = this.role();
    return role === 'owner' || role === 'admin';
  });
  readonly tenantName = computed(() => this.me()?.tenant.name ?? '');
  readonly userEmail = computed(() => this.me()?.email ?? '');

  constructor() {
    setOnSessionExpired(() => {
      this.me.set(null);
      setTokens(null);
      void this.router.navigateByUrl('/login');
    });
  }

  async bootstrap(): Promise<void> {
    if (!getRefreshToken()) {
      this.me.set(null);
      this.ready.set(true);
      return;
    }
    try {
      this.me.set(await authApi.me());
    } catch {
      setTokens(null);
      this.me.set(null);
    } finally {
      this.ready.set(true);
    }
  }

  async login(tenantSlug: string, email: string, password: string): Promise<void> {
    await authApi.login(tenantSlug, email, password);
    this.me.set(await authApi.me());
  }

  async logout(): Promise<void> {
    try {
      await authApi.logout();
    } finally {
      this.me.set(null);
      await this.router.navigateByUrl('/login');
    }
  }

  isAuthenticated(): boolean {
    return this.me() !== null || getRefreshToken() !== null;
  }

  mapLoginError(error: unknown): { kind: 'invalid' | 'rateLimit' | 'other'; retryAfter?: number } {
    if (error instanceof ApiError) {
      if (error.status === 401) {
        return { kind: 'invalid' };
      }
      if (error.status === 429) {
        return { kind: 'rateLimit', retryAfter: error.retryAfter ?? 42 };
      }
    }
    return { kind: 'other' };
  }
}
