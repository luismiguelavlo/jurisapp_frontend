import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiError } from '../../core/api/client';
import {
  caseFilesApi,
  documentsApi,
  integrationsApi,
} from '../../core/api/endpoints';
import { errorText } from '../../core/api/errors';
import type {
  MessageDetail,
  UnassignedMessage,
} from '../../core/api/types';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { UnassignedService } from '../../core/services/unassigned.service';
import { formatRadicado } from '../../core/utils/date-format';
import { AssignCaseModal } from './components/assign-case-modal/assign-case-modal';
import { UnassignedHeader } from './components/unassigned-header/unassigned-header';
import { UnassignedMessageDrawer } from './components/unassigned-message-drawer/unassigned-message-drawer';
import { UnassignedSummary } from './components/unassigned-summary/unassigned-summary';
import { UnassignedTable } from './components/unassigned-table/unassigned-table';

@Component({
  selector: 'app-unassigned-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    UnassignedHeader,
    UnassignedSummary,
    UnassignedTable,
    UnassignedMessageDrawer,
    AssignCaseModal,
  ],
  template: `
    <div class="w-full max-w-[1120px] mx-auto px-4 md:px-6 lg:px-8 py-6 flex flex-col gap-6">
      <app-unassigned-header
        [canSync]="auth.canManage()"
        [syncing]="syncing()"
        (refresh)="reload()"
        (syncAll)="syncAll()"
      />

      <app-unassigned-summary
        [total]="unassigned.total()"
        [adjuntos]="unassigned.adjuntos()"
        [lastSyncAt]="lastSyncAt()"
      />

      @if (staleHint()) {
        <div
          class="rounded-xl bg-secondary-container/40 text-on-secondary-container px-4 py-3 flex items-center justify-between gap-3"
        >
          <span class="font-body-compact text-body-compact">Hay correos nuevos</span>
          <button
            type="button"
            class="font-label-compact text-label-compact text-primary-container border-0 bg-transparent cursor-pointer"
            (click)="reload()"
          >
            Actualizar
          </button>
        </div>
      }

      @if (loading()) {
        <p class="text-body-default text-on-surface-variant m-0">Cargando correos…</p>
      } @else if (error()) {
        <div class="p-4 rounded-xl bg-[#FEF2F2] text-[#991B1B]">
          {{ error() }}
          <button
            type="button"
            class="underline border-0 bg-transparent cursor-pointer text-inherit ml-2"
            (click)="reload()"
          >
            Reintentar
          </button>
        </div>
      } @else if (unassigned.total() === 0) {
        <div
          class="bg-surface-container-lowest rounded-xl p-8 shadow-sm flex flex-col items-center gap-3 text-center"
        >
          <p class="font-body-default text-on-surface m-0">
            Todos los correos descargados están en un proceso.
          </p>
          <a
            routerLink="/documents"
            class="font-label-default text-label-default text-primary-container no-underline"
            >Ver bandeja completa</a
          >
        </div>
      } @else {
        <app-unassigned-table
          [items]="items()"
          [total]="unassigned.total()"
          [query]="query()"
          [hasMore]="!!nextCursor()"
          [loadingMore]="loadingMore()"
          (queryChange)="query.set($event)"
          (open)="openDrawer($event)"
          (assign)="openAssign($event)"
          (loadMore)="loadMore()"
        />
      }
    </div>

    @if (drawerRow(); as row) {
      <app-unassigned-message-drawer
        [row]="row"
        [message]="drawerMsg()"
        [loading]="drawerLoading()"
        [error]="drawerError()"
        (close)="closeDrawer()"
        (assign)="openAssign(row)"
        (download)="downloadAttachment(row, $event)"
      />
    }

    @if (assignRow(); as row) {
      <app-assign-case-modal
        title="Asignar a proceso"
        [subtitle]="assignSubtitle(row)"
        [fromExpediente]="false"
        [error]="assignError()"
        [submitting]="assignBusy()"
        (cancel)="assignRow.set(null); assignError.set(null)"
        (confirm)="submitAssign($event)"
      />
    }
  `,
})
export class UnassignedPage implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);
  readonly unassigned = inject(UnassignedService);

  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly error = signal<string | null>(null);
  readonly items = signal<UnassignedMessage[]>([]);
  readonly nextCursor = signal<string | null>(null);
  readonly query = signal('');
  readonly lastSyncAt = signal<string | null>(null);
  readonly syncing = signal(false);
  readonly staleHint = signal(false);

  readonly drawerRow = signal<UnassignedMessage | null>(null);
  readonly drawerMsg = signal<MessageDetail | null>(null);
  readonly drawerLoading = signal(false);
  readonly drawerError = signal<string | null>(null);

  readonly assignRow = signal<UnassignedMessage | null>(null);
  readonly assignError = signal<string | null>(null);
  readonly assignBusy = signal(false);

  private pollTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    void this.reload();
    this.pollTimer = setInterval(() => void this.pollCount(), 90_000);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  ngOnDestroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    document.removeEventListener('visibilitychange', this.onVisibility);
  }

  private readonly onVisibility = (): void => {
    if (document.visibilityState === 'visible') void this.pollCount();
  };

  reload(): void {
    void this.load(true);
  }

  async loadMore(): Promise<void> {
    const cursor = this.nextCursor();
    if (!cursor || this.loadingMore()) return;
    this.loadingMore.set(true);
    try {
      const page = await caseFilesApi.unassigned(cursor, 50);
      this.items.update((prev) => [...prev, ...page.items]);
      this.nextCursor.set(page.next_cursor);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'invalid_cursor') await this.load(true);
    } finally {
      this.loadingMore.set(false);
    }
  }

  async openDrawer(row: UnassignedMessage): Promise<void> {
    this.drawerRow.set(row);
    this.drawerMsg.set(null);
    this.drawerError.set(null);
    this.drawerLoading.set(true);
    try {
      this.drawerMsg.set(await integrationsApi.message(row.connection_id, row.message_id));
    } catch (e) {
      this.drawerError.set(
        e instanceof ApiError && e.status === 404
          ? 'El correo ya no existe'
          : errorText(e instanceof ApiError ? e.code : null),
      );
      if (e instanceof ApiError && e.status === 404) {
        this.closeDrawer();
        await this.load(true);
      }
    } finally {
      this.drawerLoading.set(false);
    }
  }

  closeDrawer(): void {
    this.drawerRow.set(null);
    this.drawerMsg.set(null);
    this.drawerError.set(null);
  }

  openAssign(row: UnassignedMessage): void {
    this.assignRow.set(row);
    this.assignError.set(null);
  }

  assignSubtitle(row: UnassignedMessage): string {
    return [row.sender, formatBogota(row.received_at), row.subject || '(sin asunto)']
      .filter(Boolean)
      .join(' · ');
  }

  async submitAssign(target: { case_id: string } | { radicado: string }): Promise<void> {
    const row = this.assignRow();
    if (!row) return;
    this.assignBusy.set(true);
    this.assignError.set(null);
    try {
      const link = await caseFilesApi.assign(row.message_id, target);
      this.assignRow.set(null);
      this.closeDrawer();
      this.items.update((list) => list.filter((i) => i.message_id !== row.message_id));
      await this.unassigned.refresh();
      const rad = link.radicado ? formatRadicado(link.radicado) : '';
      this.toast.push({
        type: 'success',
        title: `Correo asignado al proceso ${rad}`.trim(),
        description: link.case_id ? 'Ver proceso' : '',
      });
      if (link.case_id) {
        // Toast no navega: el usuario puede ir desde Procesos; opcional navegar:
        void this.router.navigate(['/cases', link.case_id]);
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        this.toast.push({
          type: 'error',
          title: 'No se pudo asignar',
          description: errorText(e.code),
        });
        this.assignRow.set(null);
        await this.load(true);
        return;
      }
      this.assignError.set(errorText(e instanceof ApiError ? e.code : null));
    } finally {
      this.assignBusy.set(false);
    }
  }

  async downloadAttachment(row: UnassignedMessage, attachmentId: string): Promise<void> {
    try {
      const blob = await documentsApi.pdf({
        connection_id: row.connection_id,
        message_id: row.message_id,
        attachment_id: attachmentId,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'adjunto.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      this.toast.push({
        type: 'error',
        title: 'No se pudo descargar',
        description: errorText(e instanceof ApiError ? e.code : null),
      });
    }
  }

  async syncAll(): Promise<void> {
    this.syncing.set(true);
    try {
      const conns = await integrationsApi.list();
      const active = conns.filter((c) => c.status === 'active');
      await Promise.all(active.map((c) => integrationsApi.sync(c.id).catch(() => null)));
      this.toast.show('Sincronización iniciada');
      await this.load(true);
    } catch (e) {
      this.toast.push({
        type: 'error',
        title: 'No se pudo sincronizar',
        description: errorText(e instanceof ApiError ? e.code : null),
      });
    } finally {
      this.syncing.set(false);
    }
  }

  private async load(reset: boolean): Promise<void> {
    if (reset) {
      this.loading.set(true);
      this.error.set(null);
      this.nextCursor.set(null);
      this.staleHint.set(false);
    }
    try {
      const [page, , conns] = await Promise.all([
        caseFilesApi.unassigned(null, 50),
        this.unassigned.refresh(),
        integrationsApi.list(),
      ]);
      this.items.set(page.items);
      this.nextCursor.set(page.next_cursor);
      const syncs = conns
        .filter((c) => c.status === 'active' && c.last_sync_at)
        .map((c) => c.last_sync_at as string);
      this.lastSyncAt.set(syncs.length ? syncs.sort().at(-1)! : null);
    } catch (e) {
      this.error.set(errorText(e instanceof ApiError ? e.code : null));
      this.items.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  private async pollCount(): Promise<void> {
    if (document.visibilityState !== 'visible') return;
    const prev = this.unassigned.total();
    await this.unassigned.refresh();
    if (this.unassigned.total() !== prev) this.staleHint.set(true);
  }
}

function formatBogota(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('es-CO', {
      timeZone: 'America/Bogota',
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return '';
  }
}
