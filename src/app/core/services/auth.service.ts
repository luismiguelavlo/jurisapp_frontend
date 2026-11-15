import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { authApi } from '../api/endpoints';
import {
  ApiError,
  getRefreshToken,
  hasSession,
  restoreRestrictedToken,
  setOnPasswordChangeRequired,
  setOnSessionExpired,
  setTokens,
} from '../api/client';
import type { InvitationAcceptIn, Me, Role } from '../api/types';

export const PASSWORD_CHANGE_PATH = '/cambiar-contrasena';
const LAST_TENANT_KEY = 'salud.tenant';

/** Última organización usada en este navegador: prellena el login. */
export function lastTenantSlug(): string {
  try {
    return localStorage.getItem(LAST_TENANT_KEY) ?? '';
  } catch {
    return '';
  }
}

function rememberTenant(slug: string): void {
  try {
    localStorage.setItem(LAST_TENANT_KEY, slug);
  } catch {
    /* sin storage: el usuario la escribe */
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);

  readonly me = signal<Me | null>(null);
  readonly ready = signal(false);

  readonly role = computed<Role | null>(() => this.me()?.role ?? null);
  readonly userId = computed(() => this.me()?.user_id ?? null);
  readonly canManage = computed(() => {
    const role = this.role();
    return role === 'owner' || role === 'admin';
  });
  /** Puede modificar datos del tenant. `auxiliar` es solo lectura: el backend le responde 403 en toda escritura. */
  readonly canEdit = computed(() => {
    const role = this.role();
    return role !== null && role !== 'auxiliar';
  });
  /**
   * SPEC 24: solo ve los correos que tiene asignados y los casos de esos correos. Dashboard, buzones y
   * "Sin clasificar" le responden 403.
   */
  readonly isScoped = computed(() => this.role() === 'auxiliar');
  /** Reasignar correos y elegir quién recibe asignaciones: owner/admin. */
  readonly canReassign = this.canManage;
  /** Pantalla a la que se llega tras entrar. */
  readonly homePath = computed(() => (this.isScoped() ? '/documents' : '/conexiones'));
  readonly tenantName = computed(() => this.me()?.tenant.name ?? '');
  readonly userEmail = computed(() => this.me()?.email ?? '');
  /** "Nombre Apellido", o el correo si no hay nombre. */
  readonly displayName = computed(() => {
    const m = this.me();
    if (!m) return '';
    return [m.first_name, m.last_name].filter(Boolean).join(' ').trim() || m.email;
  });
  readonly passwordChangeRequired = computed(() => this.me()?.password_change_required ?? false);

  constructor() {
    setOnSessionExpired(() => {
      this.me.set(null);
      setTokens(null);
      void this.router.navigateByUrl('/login');
    });
    setOnPasswordChangeRequired(() => {
      void this.router.navigateByUrl(PASSWORD_CHANGE_PATH);
    });
  }

  async bootstrap(): Promise<void> {
    const restricted = !getRefreshToken() && restoreRestrictedToken();
    if (!getRefreshToken() && !restricted) {
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

  /** Devuelve true si entró con contraseña temporal y debe crear una nueva. */
  async login(tenantSlug: string, email: string, password: string): Promise<boolean> {
    const t = await authApi.login(tenantSlug, email, password);
    rememberTenant(tenantSlug);
    this.me.set(await authApi.me());
    return t.password_change_required;
  }

  async acceptInvitation(body: InvitationAcceptIn): Promise<void> {
    const res = await authApi.acceptInvitation(body);
    rememberTenant(res.tenant_slug);
    this.me.set(await authApi.me());
    this.ready.set(true);
  }

  /** Cambio de contraseña (obligatorio u opcional). Los tokens nuevos ya quedan guardados. */
  async changePassword(newPassword: string, currentPassword?: string): Promise<void> {
    await authApi.changePassword(
      currentPassword === undefined
        ? { new_password: newPassword }
        : { current_password: currentPassword, new_password: newPassword },
    );
    this.me.set(await authApi.me());
  }

  async updateName(first_name: string, last_name: string): Promise<void> {
    this.me.set(await authApi.updateMe({ first_name, last_name }));
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
    return this.me() !== null || hasSession();
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
