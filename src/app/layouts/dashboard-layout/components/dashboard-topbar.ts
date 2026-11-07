import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { alertsApi } from '../../../core/api/endpoints';
import type { Role } from '../../../core/api/types';
import { AuthService } from '../../../core/services/auth.service';
import { MaterialIcon } from '../../../shared/components/material-icon/material-icon';

@Component({
  selector: 'app-dashboard-topbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon, RouterLink],
  template: `
    <header
      class="fixed top-0 left-60 right-0 h-14 bg-background z-40 px-6 flex items-center justify-between border-b border-outline-variant/70"
    >
      <div class="flex items-center gap-2 min-w-0">
        <app-material-icon name="domain" [size]="16" className="text-on-surface-variant" />
        <span class="text-label-default text-on-surface truncate">{{ auth.tenantName() }}</span>
      </div>

      <div class="flex items-center gap-space-md">
        <a
          routerLink="/documents"
          class="relative w-8 h-8 rounded-[6px] flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors no-underline"
          title="Alertas"
        >
          <app-material-icon name="notifications" [size]="18" />
          @if (unread() > 0) {
            <span
              class="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-error text-on-error text-[10px] font-semibold flex items-center justify-center"
              >{{ unread() > 99 ? '99+' : unread() }}</span
            >
          }
        </a>

        <div class="flex items-center gap-space-xs">
          <span class="text-body-compact text-on-surface">{{ auth.userEmail() }}</span>
          @if (auth.role(); as role) {
            <span
              class="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-caption"
              >{{ roleLabel[role] }}</span
            >
          }
        </div>

        <div class="flex items-center gap-space-xs">
          <button
            type="button"
            class="text-label-compact text-on-surface-variant hover:text-error transition-colors px-space-xs py-1 cursor-pointer"
            (click)="auth.logout()"
          >
            Cerrar sesión
          </button>
          <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <app-material-icon name="person" [size]="18" className="text-on-primary" />
          </div>
        </div>
      </div>
    </header>
  `,
})
export class DashboardTopbar implements OnInit {
  readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  readonly roleLabel: Record<Role, string> = {
    owner: 'Propietario',
    admin: 'Administrador',
    member: 'Miembro',
  };

  readonly unread = signal(0);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    void this.refreshUnread();
    this.intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') void this.refreshUnread();
    }, 90_000);
    const onVis = () => {
      if (document.visibilityState === 'visible') void this.refreshUnread();
    };
    document.addEventListener('visibilitychange', onVis);
    this.destroyRef.onDestroy(() => {
      if (this.intervalId) clearInterval(this.intervalId);
      document.removeEventListener('visibilitychange', onVis);
    });
  }

  private async refreshUnread(): Promise<void> {
    try {
      const { no_leidas } = await alertsApi.unreadCount();
      this.unread.set(no_leidas);
    } catch {
      /* silencioso: campana no bloquea el shell */
    }
  }
}
