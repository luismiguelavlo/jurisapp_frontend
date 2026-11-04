import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiError } from '../../core/api/client';
import { integrationsApi } from '../../core/api/endpoints';
import { errorText } from '../../core/api/errors';
import type { EmailConnection } from '../../core/api/types';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ConnectMailboxModal } from './components/connect-mailbox-modal/connect-mailbox-modal';
import { MailConnectionsHeader } from './components/mail-connections-header/mail-connections-header';
import { MailboxEmptyState } from './components/mailbox-empty-state/mailbox-empty-state';
import { MailboxMetaFooter } from './components/mailbox-meta-footer/mailbox-meta-footer';
import { MailboxTable } from './components/mailbox-table/mailbox-table';
import type { MailboxMenuAction } from './models/mailbox.models';

@Component({
  selector: 'app-mail-connections-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MailConnectionsHeader,
    MailboxTable,
    MailboxEmptyState,
    MailboxMetaFooter,
    ConnectMailboxModal,
  ],
  template: `
    <div class="max-w-[1120px] mx-auto p-space-xl">
      <div
        class="flex flex-col w-full transition-[filter,opacity]"
        [class.opacity-40]="modalOpen()"
        [class.pointer-events-none]="modalOpen()"
        [class.select-none]="modalOpen()"
        [style.filter]="modalOpen() ? 'blur(1px)' : null"
      >
        <app-mail-connections-header (connectClick)="openConnectModal()" />

        @if (loading()) {
          <p class="text-body-default text-on-surface-variant">Cargando conexiones…</p>
        } @else if (connections().length === 0) {
          <app-mailbox-empty-state (connectClick)="openConnectModal()" />
        } @else {
          <app-mailbox-table
            [mailboxes]="connections()"
            (action)="onRowAction($event.mailbox, $event.action)"
          />
          <app-mailbox-meta-footer [summary]="footerSummary()" />
        }
      </div>
    </div>

    @if (modalOpen()) {
      <app-connect-mailbox-modal
        (closed)="closeConnectModal()"
        (connected)="onConnected($event)"
      />
    }
  `,
})
export class MailConnectionsPage {
  readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly connections = signal<EmailConnection[]>([]);
  readonly loading = signal(true);
  readonly modalOpen = signal(false);

  constructor() {
    void this.reload();
  }

  footerSummary(): string {
    const list = this.connections();
    const active = list.filter((c) => c.status === 'active').length;
    const warn = list.filter((c) => c.status === 'reauth_required' || c.status === 'error').length;
    const disc = list.filter((c) => c.status === 'disconnected').length;
    return `${list.length} buzones configurados (${active} activos, ${warn} con advertencia, ${disc} desconectados).`;
  }

  openConnectModal(): void {
    if (!this.auth.canManage()) {
      this.toast.push({
        type: 'error',
        title: 'Permisos insuficientes',
        description: 'Tu rol no permite gestionar conexiones.',
      });
      return;
    }
    this.modalOpen.set(true);
  }

  closeConnectModal(): void {
    this.modalOpen.set(false);
  }

  onConnected(connection: EmailConnection): void {
    this.modalOpen.set(false);
    void this.router.navigateByUrl(`/conexiones/${connection.id}`);
  }

  async onRowAction(mailbox: EmailConnection, action: MailboxMenuAction): Promise<void> {
    try {
      switch (action.id) {
        case 'sync': {
          await integrationsApi.sync(mailbox.id);
          this.toast.push({
            type: 'sync',
            title: 'Sincronización en cola',
            description: mailbox.mailbox_address,
          });
          break;
        }
        case 'test': {
          const result = await integrationsApi.test(mailbox.id);
          if (result.ok) {
            this.toast.push({
              type: 'success',
              title: 'Conexión verificada',
              description: mailbox.mailbox_address,
            });
          } else {
            this.toast.push({
              type: 'error',
              title: 'Fallo de verificación',
              description: errorText(result.connection.last_error_code),
            });
          }
          await this.reload();
          break;
        }
        case 'disconnect': {
          const pending = await integrationsApi.disconnect(mailbox.id);
          if (pending === undefined) {
            this.toast.push({
              type: 'error',
              title: 'Buzón desconectado',
              description: mailbox.mailbox_address,
            });
          } else {
            this.toast.push({
              type: 'warn',
              title: 'Desconectado',
              description: errorText('secret_delete_failed'),
            });
          }
          await this.reload();
          break;
        }
        case 'reauth':
          this.modalOpen.set(true);
          break;
        default:
          void this.router.navigateByUrl(`/conexiones/${mailbox.id}`);
      }
    } catch (error) {
      this.handleApiError(error);
    }
  }

  private async reload(): Promise<void> {
    this.loading.set(true);
    try {
      this.connections.set(await integrationsApi.list());
    } catch (error) {
      this.handleApiError(error);
    } finally {
      this.loading.set(false);
    }
  }

  private handleApiError(error: unknown): void {
    if (error instanceof ApiError) {
      if (error.status === 403) {
        this.toast.push({
          type: 'error',
          title: 'Permisos insuficientes',
          description: 'No puedes realizar esta acción.',
        });
        return;
      }
      if (error.status === 429) {
        this.toast.push({
          type: 'error',
          title: 'Demasiadas solicitudes',
          description: 'Espera un momento e intenta de nuevo.',
        });
        return;
      }
      this.toast.push({
        type: 'error',
        title: 'Error',
        description: errorText(error.code),
      });
      return;
    }
    this.toast.push({
      type: 'error',
      title: 'Error',
      description: 'Ocurrió un error. Intenta de nuevo.',
    });
  }
}
