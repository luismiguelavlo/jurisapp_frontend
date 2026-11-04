import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiError } from '../../core/api/client';
import { integrationsApi } from '../../core/api/endpoints';
import { errorText } from '../../core/api/errors';
import { providerIcon, providerLabel } from '../../core/api/labels';
import type {
  ConnectionStatus,
  EmailConnection,
  EmailMessage,
  SyncRun,
} from '../../core/api/types';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { clearRunId, loadRunId, saveRunId } from '../../core/utils/run-storage';
import { ConnectionHealthBanner } from './components/connection-health-banner/connection-health-banner';
import { ConnectionSecurityPanel } from './components/connection-security-panel/connection-security-panel';
import { DisconnectMailboxModal } from './components/disconnect-mailbox-modal/disconnect-mailbox-modal';
import { MailboxDetailHeader } from './components/mailbox-detail-header/mailbox-detail-header';
import { SyncStatusStrip } from './components/sync-status-strip/sync-status-strip';
import { SyncedMessagesTable } from './components/synced-messages-table/synced-messages-table';
import type { ConnectionHealth, MailboxDetail, SyncPhase } from './models/mailbox-detail.models';

@Component({
  selector: 'app-mailbox-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ConnectionHealthBanner,
    MailboxDetailHeader,
    SyncStatusStrip,
    ConnectionSecurityPanel,
    SyncedMessagesTable,
    DisconnectMailboxModal,
  ],
  template: `
    <div class="flex flex-col w-full">
      @if (health() !== 'active') {
        <app-connection-health-banner
          [health]="health()"
          (reauthorize)="onReauthorize()"
          (diagnose)="onDiagnose()"
        />
      }

      <div class="w-full px-margin-desktop py-space-lg">
        <div class="max-w-[1120px] mx-auto flex flex-col gap-space-lg">
          @if (loading()) {
            <p class="text-body-default text-on-surface-variant">Cargando conexión…</p>
          } @else if (detail(); as mailbox) {
            <app-mailbox-detail-header
              [mailbox]="mailbox"
              [health]="health()"
              [testing]="testing()"
              (testConnection)="onTestConnection()"
              (sync)="onStartSync()"
              (disconnect)="disconnectOpen.set(true)"
            />

            @if (syncRun() || syncPhase() === 'running' || syncPhase() === 'completed') {
              <app-sync-status-strip
                [phase]="syncPhase()"
                [run]="syncRun()"
                (continueBatch)="onStartSync()"
              />
            }

            <app-connection-security-panel [mailbox]="mailbox" [connection]="connection()" />

            <app-synced-messages-table
              [messages]="messages()"
              [empty]="messages().length === 0"
              [shownCount]="messages().length"
              [totalCount]="messages().length"
              [loadingMore]="loadingMore()"
              [hasMore]="!!nextCursor()"
              (loadMore)="onLoadMore()"
            />
          }
        </div>
      </div>
    </div>

    @if (disconnectOpen()) {
      <app-disconnect-mailbox-modal
        (cancelled)="disconnectOpen.set(false)"
        (confirmed)="onConfirmDisconnect()"
      />
    }
  `,
})
export class MailboxDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly connection = signal<EmailConnection | null>(null);
  readonly messages = signal<EmailMessage[]>([]);
  readonly nextCursor = signal<string | null>(null);
  readonly testing = signal(false);
  readonly syncPhase = signal<SyncPhase>('idle');
  readonly syncRun = signal<SyncRun | null>(null);
  readonly disconnectOpen = signal(false);
  readonly loadingMore = signal(false);

  private pollAborted = false;

  readonly detail = computed<MailboxDetail | null>(() => {
    const conn = this.connection();
    if (!conn) {
      return null;
    }
    return {
      id: conn.id,
      email: conn.mailbox_address,
      clinicalId: conn.id.slice(0, 8).toUpperCase(),
      providerLabel: providerLabel[conn.provider],
      providerIcon: providerIcon[conn.provider],
      priorityLabel: 'Alta',
      linkedAt: new Date(conn.created_at).toLocaleString('es-CL', { timeZone: 'UTC' }) + ' UTC',
      linkedBy: this.auth.userEmail(),
    };
  });

  readonly health = computed<ConnectionHealth>(() => {
    const status = this.connection()?.status;
    return mapHealth(status);
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.pollAborted = true;
    });

    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('id');
      if (id) {
        void this.load(id);
      }
    });
  }

  async onReauthorize(): Promise<void> {
    const conn = this.connection();
    if (!conn) {
      return;
    }
    if (conn.provider === 'imap') {
      this.toast.push({
        type: 'sync',
        title: 'Reautorización IMAP',
        description: 'Usa Conectar buzón con las mismas credenciales.',
      });
      await this.router.navigateByUrl('/conexiones');
      return;
    }
    try {
      const { authorization_url } = await integrationsApi.authorize(conn.provider);
      window.location.assign(authorization_url);
    } catch (error) {
      this.handleError(error);
    }
  }

  onDiagnose(): void {
    void this.onTestConnection();
  }

  async onTestConnection(): Promise<void> {
    const id = this.connection()?.id;
    if (!id) {
      return;
    }
    this.testing.set(true);
    try {
      const { ok, connection } = await integrationsApi.test(id);
      this.connection.set(connection);
      if (ok) {
        this.toast.push({
          type: 'success',
          title: 'Conexión verificada',
          description: connection.mailbox_address,
        });
      } else {
        this.toast.push({
          type: 'error',
          title: 'Fallo de verificación',
          description: errorText(connection.last_error_code),
        });
      }
    } catch (error) {
      this.handleError(error);
    } finally {
      this.testing.set(false);
    }
  }

  async onStartSync(): Promise<void> {
    const id = this.connection()?.id;
    if (!id) {
      return;
    }
    try {
      const run = await integrationsApi.sync(id);
      saveRunId(id, run.id);
      this.syncRun.set(run);
      this.syncPhase.set(run.status === 'queued' ? 'idle' : 'running');
      if (run.status === 'queued') {
        this.syncPhase.set('running');
      }
      this.toast.push({
        type: 'sync',
        title: 'Sincronización en cola',
        description: 'Consultando proveedor…',
      });
      await this.pollRun(id, run.id);
    } catch (error) {
      this.handleError(error);
    }
  }

  async onLoadMore(): Promise<void> {
    const id = this.connection()?.id;
    if (!id || !this.nextCursor()) {
      return;
    }
    this.loadingMore.set(true);
    try {
      const page = await integrationsApi.messages(id, this.nextCursor());
      this.messages.update((prev) => [...prev, ...page.items]);
      this.nextCursor.set(page.next_cursor);
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        await this.reloadMessages(id, true);
      } else {
        this.handleError(error);
      }
    } finally {
      this.loadingMore.set(false);
    }
  }

  async onConfirmDisconnect(): Promise<void> {
    const id = this.connection()?.id;
    this.disconnectOpen.set(false);
    if (!id) {
      return;
    }
    try {
      const pending = await integrationsApi.disconnect(id);
      if (pending === undefined) {
        this.toast.push({
          type: 'error',
          title: 'Buzón desconectado',
          description: 'Credenciales revocadas.',
        });
        await this.router.navigateByUrl('/conexiones');
      } else {
        this.connection.set(pending);
        this.toast.push({
          type: 'warn',
          title: 'Desconectado',
          description: errorText('secret_delete_failed'),
        });
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  private async load(id: string): Promise<void> {
    this.loading.set(true);
    this.pollAborted = false;
    try {
      const [conn, page] = await Promise.all([
        integrationsApi.get(id),
        integrationsApi.messages(id),
      ]);
      this.connection.set(conn);
      this.messages.set(page.items);
      this.nextCursor.set(page.next_cursor);

      const runId = loadRunId(id);
      if (runId) {
        void this.pollRun(id, runId);
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        this.toast.push({
          type: 'error',
          title: 'Conexión no encontrada',
          description: 'Volviendo a la lista…',
        });
        await this.router.navigateByUrl('/conexiones');
        return;
      }
      this.handleError(error);
    } finally {
      this.loading.set(false);
    }
  }

  private async reloadMessages(id: string, reset = false): Promise<void> {
    const page = await integrationsApi.messages(id, reset ? null : this.nextCursor());
    this.messages.set(reset ? page.items : [...this.messages(), ...page.items]);
    this.nextCursor.set(page.next_cursor);
  }

  private async pollRun(id: string, runId: string): Promise<void> {
    let delay = 2000;
    this.syncPhase.set('running');

    for (;;) {
      if (this.pollAborted) {
        return;
      }
      try {
        const run = await integrationsApi.syncRun(id, runId);
        this.syncRun.set(run);

        if (run.status === 'succeeded' || run.status === 'failed') {
          this.syncPhase.set(run.status === 'succeeded' ? 'completed' : 'idle');
          clearRunId(id);
          this.connection.set(await integrationsApi.get(id));
          if (run.status === 'succeeded' && run.messages_inserted > 0) {
            await this.reloadMessages(id, true);
            this.toast.push({
              type: 'success',
              title: 'Lote completado',
              description: `${run.messages_inserted} mensajes nuevos`,
            });
          }
          if (run.status === 'failed') {
            this.toast.push({
              type: 'error',
              title: 'Sincronización fallida',
              description: errorText(run.error_code),
            });
          }
          return;
        }

        await new Promise((r) => setTimeout(r, delay));
        delay = Math.min(delay * 1.5, 10000);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          clearRunId(id);
          this.syncPhase.set('idle');
          this.syncRun.set(null);
          return;
        }
        this.handleError(error);
        return;
      }
    }
  }

  private handleError(error: unknown): void {
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
          description: 'Espera un momento.',
        });
        return;
      }
      if (error.status === 409) {
        this.toast.push({
          type: 'error',
          title: 'Conexión inactiva',
          description: errorText(error.code),
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

function mapHealth(status: ConnectionStatus | undefined): ConnectionHealth {
  switch (status) {
    case 'reauth_required':
      return 'reauth';
    case 'error':
      return 'error';
    default:
      return 'active';
  }
}
