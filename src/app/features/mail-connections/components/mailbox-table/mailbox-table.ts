import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { fromEvent } from 'rxjs';
import {
  formatRelativeTime,
  providerIcon,
  providerLabel,
  statusBadge,
  statusDotClass,
} from '../../../../core/api/labels';
import type { EmailConnection } from '../../../../core/api/types';
import { AuthService } from '../../../../core/services/auth.service';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';
import { MailboxRowMenu } from '../mailbox-row-menu/mailbox-row-menu';
import type { MailboxMenuAction } from '../../models/mailbox.models';

@Component({
  selector: 'app-mailbox-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon, MailboxRowMenu, RouterLink],
  template: `
    <div class="bg-surface-container-lowest rounded-xl overflow-hidden">
      <div
        class="px-space-md py-space-sm flex flex-wrap items-center justify-between gap-space-sm"
      >
        <div class="relative w-full sm:w-72">
          <span
            class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-on-surface-variant"
          >
            <app-material-icon name="search" [size]="16" />
          </span>
          <input
            type="text"
            class="w-full h-9 pl-9 pr-3 text-body-compact bg-surface-container-low text-on-surface placeholder:text-on-surface-variant rounded-lg focus:outline-none focus:bg-surface-container-lowest transition-all"
            placeholder="Filtrar por dirección..."
            [value]="filter()"
            (input)="onFilterInput($event)"
          />
        </div>
        <div class="flex items-center gap-space-xs text-on-surface-variant text-caption">
          <span class="w-2 h-2 rounded-full bg-primary-container animate-pulse"></span>
          <span>Sincronización en tiempo real</span>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left">
          <thead>
            <tr class="h-9 bg-surface-container-low text-on-surface-variant text-label-compact">
              <th class="px-space-md font-medium" scope="col">Buzón clínico</th>
              <th class="px-space-md font-medium" scope="col">Proveedor</th>
              <th class="px-space-md font-medium" scope="col">Estado</th>
              <th class="px-space-md font-medium" scope="col">Última sincronización</th>
              <th class="px-space-md font-medium text-right" scope="col">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-container">
            @for (mailbox of filtered(); track mailbox.id) {
              <tr
                class="h-11 hover:bg-surface-container-low/60 transition-colors"
                [class.opacity-60]="mailbox.status === 'disconnected'"
              >
                <td class="px-space-md py-2.5">
                  <a
                    [routerLink]="['/conexiones', mailbox.id]"
                    class="text-body-medium text-on-surface hover:underline truncate block"
                    >{{ mailbox.mailbox_address }}</a
                  >
                </td>
                <td class="px-space-md py-2.5">
                  <div class="inline-flex items-center gap-1.5 text-body-compact text-on-surface">
                    <app-material-icon
                      [name]="providerIcon[mailbox.provider]"
                      [size]="16"
                      className="text-on-surface-variant"
                    />
                    <span>{{ providerLabel[mailbox.provider] }}</span>
                  </div>
                </td>
                <td class="px-space-md py-2.5">
                  <div
                    class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-surface-container-low text-on-surface"
                  >
                    <span
                      class="w-1.5 h-1.5 rounded-full"
                      [class]="statusDotClass(mailbox.status)"
                    ></span>
                    <span class="text-caption font-medium">{{
                      statusBadge[mailbox.status].label
                    }}</span>
                  </div>
                </td>
                <td class="px-space-md py-2.5 text-body-compact text-on-surface-variant">
                  {{ formatRelativeTime(mailbox.last_sync_at) }}
                </td>
                <td class="px-space-md py-2.5 text-right">
                  @if (auth.canManage()) {
                    <button
                      type="button"
                      class="w-7 h-7 inline-flex items-center justify-center rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low cursor-pointer"
                      (click)="toggleMenu(mailbox.id, $event)"
                    >
                      <app-material-icon name="more_horiz" [size]="16" />
                    </button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      @if (openMenu(); as menu) {
        <app-mailbox-row-menu
          [actions]="menu.actions"
          [canAdmin]="true"
          [top]="menu.top"
          [left]="menu.left"
          (actionSelect)="onMenuAction(menu.mailbox, $event)"
        />
      }
    </div>
  `,
})
export class MailboxTable {
  readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly mailboxes = input.required<ReadonlyArray<EmailConnection>>();
  readonly action = output<{ mailbox: EmailConnection; action: MailboxMenuAction }>();

  readonly filter = signal('');
  readonly openMenu = signal<{
    mailbox: EmailConnection;
    actions: ReadonlyArray<MailboxMenuAction>;
    top: number;
    left: number;
  } | null>(null);

  readonly providerLabel = providerLabel;
  readonly providerIcon = providerIcon;
  readonly statusBadge = statusBadge;
  readonly statusDotClass = statusDotClass;
  readonly formatRelativeTime = formatRelativeTime;

  readonly filtered = computed(() => {
    const q = this.filter().trim().toLowerCase();
    if (!q) {
      return this.mailboxes();
    }
    return this.mailboxes().filter((m) =>
      `${m.mailbox_address} ${providerLabel[m.provider]} ${statusBadge[m.status].label}`
        .toLowerCase()
        .includes(q),
    );
  });

  constructor() {
    fromEvent(document, 'click')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.openMenu.set(null));
    fromEvent(window, 'resize')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.openMenu.set(null));
    fromEvent(window, 'scroll', { capture: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.openMenu.set(null));
  }

  onFilterInput(event: Event): void {
    this.filter.set((event.target as HTMLInputElement).value);
  }

  toggleMenu(id: string, event: MouseEvent): void {
    event.stopPropagation();
    const current = this.openMenu();
    if (current?.mailbox.id === id) {
      this.openMenu.set(null);
      return;
    }
    const mailbox = this.mailboxes().find((m) => m.id === id);
    const btn = event.currentTarget;
    if (!mailbox || !(btn instanceof HTMLElement)) return;

    const rect = btn.getBoundingClientRect();
    const menuWidth = 192;
    const menuApproxHeight = 140;
    const gap = 4;
    let top = rect.bottom + gap;
    let left = rect.right - menuWidth;
    if (left < 8) left = 8;
    if (left + menuWidth > window.innerWidth - 8) {
      left = window.innerWidth - menuWidth - 8;
    }
    if (top + menuApproxHeight > window.innerHeight - 8) {
      top = Math.max(8, rect.top - menuApproxHeight - gap);
    }

    this.openMenu.set({
      mailbox,
      actions: this.actionsFor(mailbox),
      top,
      left,
    });
  }

  onMenuAction(mailbox: EmailConnection, menuAction: MailboxMenuAction): void {
    this.openMenu.set(null);
    this.action.emit({ mailbox, action: menuAction });
  }

  actionsFor(mailbox: EmailConnection): ReadonlyArray<MailboxMenuAction> {
    if (mailbox.status === 'reauth_required') {
      return [
        { id: 'reauth', label: 'Reautorizar', icon: 'key', tone: 'primary' },
        { id: 'disconnect', label: 'Desconectar', icon: 'link_off', tone: 'error', requiresAdmin: true },
      ];
    }
    if (mailbox.status === 'disconnected') {
      return [
        { id: 'reauth', label: 'Reactivar conexión', icon: 'restart_alt', tone: 'primary', requiresAdmin: true },
        { id: 'disconnect', label: 'Eliminar configuración', icon: 'delete_forever', tone: 'error', requiresAdmin: true },
      ];
    }
    return [
      { id: 'sync', label: 'Sincronizar ahora', icon: 'sync' },
      { id: 'test', label: 'Probar conexión', icon: 'wifi_tethering' },
      { id: 'disconnect', label: 'Desconectar', icon: 'link_off', tone: 'error', requiresAdmin: true },
    ];
  }
}
