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
import { errorText } from '../../../../core/api/errors';
import {
  connectionStatusHelp,
  connectionStatusInk,
  connectionStatusRail,
  formatRelativeTime,
  providerIcon,
  providerLabel,
  statusBadge,
} from '../../../../core/api/labels';
import { formatBogotaDateTime } from '../../../../core/utils/date-format';
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
    <div class="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
      @if (mailboxes().length > 5) {
        <div class="px-6 py-3 border-b border-outline-variant/70">
          <div class="relative w-full sm:w-72">
            <label class="sr-only" for="mailbox-filter">Filtrar buzones</label>
            <app-material-icon
              name="search"
              [size]="16"
              className="absolute left-2.5 top-2 text-on-surface-variant pointer-events-none"
            />
            <input
              id="mailbox-filter"
              type="search"
              class="w-full h-8 pl-8 pr-3 rounded-[4px] bg-surface-container-lowest border border-outline-variant text-body-compact text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              placeholder="Filtrar por dirección"
              [value]="filter()"
              (input)="onFilterInput($event)"
            />
          </div>
        </div>
      }

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse min-w-[760px]">
          <thead>
            <tr class="text-caption text-on-surface-variant border-b border-outline-variant/70">
              <th class="py-2.5 pl-6 pr-4 font-medium" scope="col">Buzón</th>
              <th class="py-2.5 px-4 font-medium" scope="col">Estado</th>
              <th class="py-2.5 px-4 font-medium whitespace-nowrap" scope="col">Última lectura</th>
              <th class="py-2.5 pl-4 pr-6" scope="col"><span class="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            @for (mailbox of filtered(); track mailbox.id) {
              @let help = connectionStatusHelp(mailbox.status);
              <tr class="border-b border-outline-variant/40 last:border-b-0 align-top">
                <td class="py-3.5 pl-6 pr-4" [class]="connectionStatusRail(mailbox.status)">
                  <a
                    [routerLink]="['/conexiones', mailbox.id]"
                    class="block text-body-default font-medium no-underline hover:underline break-all"
                    [class]="mailbox.status === 'disconnected' ? 'text-on-surface-variant' : 'text-on-surface'"
                    >{{ mailbox.mailbox_address }}</a
                  >
                  <span class="mt-0.5 inline-flex items-center gap-1 text-caption text-on-surface-variant">
                    <app-material-icon [name]="providerIcon[mailbox.provider]" [size]="14" />
                    {{ providerLabel[mailbox.provider] }}
                  </span>
                </td>
                <td class="py-3.5 px-4 max-w-[340px]">
                  <span class="block text-body-compact font-medium" [class]="connectionStatusInk(mailbox.status)">{{
                    statusBadge[mailbox.status].label
                  }}</span>
                  @if (mailbox.status === 'error' && mailbox.last_error_code) {
                    <span class="block text-caption text-on-surface-variant">{{
                      errorText(mailbox.last_error_code)
                    }}</span>
                  } @else if (help) {
                    <span class="block text-caption text-on-surface-variant">{{ help }}</span>
                  }
                </td>
                <td class="py-3.5 px-4 whitespace-nowrap">
                  <time
                    class="text-body-compact text-on-surface"
                    [attr.title]="mailbox.last_sync_at ? formatBogotaDateTime(mailbox.last_sync_at) : null"
                    >{{ lastRead(mailbox) }}</time
                  >
                </td>
                <td class="py-3 pl-4 pr-6">
                  @if (auth.canManage()) {
                    <div class="flex items-center justify-end gap-1">
                      @if (primaryAction(mailbox); as pa) {
                        <button
                          type="button"
                          class="h-8 px-3 rounded-[4px] text-label-compact whitespace-nowrap border-0 cursor-pointer"
                          [class]="
                            mailbox.status === 'disconnected'
                              ? 'bg-transparent text-primary hover:bg-surface-container'
                              : 'bg-primary text-on-primary hover:bg-brand-hover'
                          "
                          (click)="action.emit({ mailbox, action: pa })"
                        >
                          {{ pa.label }}
                        </button>
                      }
                      <button
                        type="button"
                        class="w-8 h-8 inline-flex items-center justify-center rounded-[4px] text-on-surface-variant hover:text-on-surface hover:bg-surface-container border-0 bg-transparent cursor-pointer"
                        [attr.aria-label]="'Más acciones para ' + mailbox.mailbox_address"
                        (click)="toggleMenu(mailbox.id, $event)"
                      >
                        <app-material-icon name="more_horiz" [size]="18" />
                      </button>
                    </div>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="4" class="px-6 py-6 text-body-compact text-on-surface-variant">
                  Ningún buzón coincide con «{{ filter().trim() }}».
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
  readonly connectionStatusRail = connectionStatusRail;
  readonly connectionStatusInk = connectionStatusInk;
  readonly connectionStatusHelp = connectionStatusHelp;
  readonly formatBogotaDateTime = formatBogotaDateTime;
  readonly errorText = errorText;

  lastRead(m: EmailConnection): string {
    return m.last_sync_at ? formatRelativeTime(m.last_sync_at) : 'Todavía no se ha leído';
  }

  /** Acción visible en la fila cuando el buzón necesita algo. */
  primaryAction(m: EmailConnection): MailboxMenuAction | null {
    switch (m.status) {
      case 'reauth_required':
      case 'pending':
        return { id: 'reauth', label: 'Reautorizar', icon: 'key', tone: 'primary' };
      case 'error':
        return { id: 'test', label: 'Probar conexión', icon: 'wifi_tethering', tone: 'primary' };
      case 'disconnected':
        return { id: 'reauth', label: 'Reactivar', icon: 'restart_alt', tone: 'primary' };
      default:
        return null;
    }
  }

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

  /** Menú secundario; la acción principal del estado ya está visible en la fila. */
  actionsFor(mailbox: EmailConnection): ReadonlyArray<MailboxMenuAction> {
    const open: MailboxMenuAction = { id: 'open', label: 'Ver detalle', icon: 'open_in_new' };
    switch (mailbox.status) {
      case 'reauth_required':
      case 'pending':
        return [open, { id: 'disconnect', label: 'Desconectar', icon: 'link_off', tone: 'error', requiresAdmin: true }];
      case 'disconnected':
        return [open, { id: 'disconnect', label: 'Eliminar configuración', icon: 'delete_forever', tone: 'error', requiresAdmin: true }];
      case 'error':
        return [
          open,
          { id: 'sync', label: 'Leer ahora', icon: 'sync' },
          { id: 'disconnect', label: 'Desconectar', icon: 'link_off', tone: 'error', requiresAdmin: true },
        ];
      default:
        return [
          open,
          { id: 'sync', label: 'Leer ahora', icon: 'sync' },
          { id: 'test', label: 'Probar conexión', icon: 'wifi_tethering' },
          { id: 'disconnect', label: 'Desconectar', icon: 'link_off', tone: 'error', requiresAdmin: true },
        ];
    }
  }
}
