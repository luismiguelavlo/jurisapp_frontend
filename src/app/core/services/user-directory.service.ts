import { Injectable, computed, signal } from '@angular/core';
import { usersApi } from '../api/endpoints';
import type { TenantUser } from '../api/types';
import { displayName } from '../utils/person-name';

/**
 * Usuarios del tenant (`GET /users`, cualquier rol) para resolver user_id → nombre y elegir revisores.
 * Se carga una vez por sesión; `refresh()` tras cambios.
 */
@Injectable({ providedIn: 'root' })
export class UserDirectoryService {
  readonly users = signal<TenantUser[]>([]);
  private loading: Promise<void> | null = null;

  readonly names = computed<ReadonlyMap<string, string>>(
    () => new Map(this.users().map((u) => [u.id, displayName(u)])),
  );
  /** Revisores posibles para reasignar a mano: miembros activos de cualquier rol. */
  readonly active = computed(() => this.users().filter((u) => u.status === 'active'));

  ensureLoaded(): Promise<void> {
    if (this.users().length > 0) return Promise.resolve();
    return this.refresh();
  }

  refresh(): Promise<void> {
    this.loading ??= usersApi
      .list()
      .then((list) => this.users.set(list))
      .catch(() => undefined)
      .finally(() => (this.loading = null));
    return this.loading;
  }
}
