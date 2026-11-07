import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiError } from '../../core/api/client';
import { caseFilesApi, casesApi, inboxApi, integrationsApi } from '../../core/api/endpoints';
import { errorText } from '../../core/api/errors';
import type {
  CaseDetail,
  EmailConnection,
  InboxMessageDetail,
  MessageDetail,
} from '../../core/api/types';
import { ToastService } from '../../core/services/toast.service';
import { UnassignedService } from '../../core/services/unassigned.service';
import { formatRadicado } from '../../core/utils/date-format';
import { radicadoSourceLabel } from '../../core/api/document-labels';
import { AssignCaseModal } from '../cases/components/assign-case-modal/assign-case-modal';
import { DocumentReview } from '../providencia-review/components/document-review/document-review';
import { MessageDetailHeader } from './components/message-detail-header/message-detail-header';
import { MessageDocumentTabs } from './components/message-document-tabs/message-document-tabs';

const POLL_MS = 5000;
const POLL_MAX = 24;

/**
 * Detalle de un correo (`GET /messages/{id}`): cabecera y una pestaña por documento con
 * todo lo extraído. `?doc=<attachment_id>` abre esa pestaña.
 */
@Component({
  selector: 'app-message-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MessageDetailHeader, MessageDocumentTabs, DocumentReview, AssignCaseModal],
  template: `
    <div
      class="max-w-[1120px] w-full mx-auto px-margin-tablet lg:px-margin-desktop py-space-md flex flex-col gap-space-md"
    >
      @if (loading()) {
        <p class="text-body-default text-on-surface-variant">Cargando correo…</p>
      } @else if (loadError()) {
        <div class="p-space-md rounded-lg bg-[#FEF2F2] text-[#991B1B]">
          {{ loadError() }}
          <button
            type="button"
            class="ml-2 underline border-0 bg-transparent cursor-pointer text-inherit"
            (click)="reload()"
          >
            Reintentar
          </button>
        </div>
      } @else if (message(); as m) {
        <app-message-detail-header
          [message]="m"
          [connection]="connection()"
          (back)="goInbox()"
          (assign)="assignOpen.set(true)"
        />

        @if (m.documentos_detalle.length === 0) {
          <div class="bg-surface-container-lowest rounded-xl shadow-sm px-6 py-8">
            <p class="m-0 text-body-default text-on-surface-variant">
              Este correo no trae documentos; se asoció al caso por
              {{ radicadoSourceLabel(m.caso.radicado_source) }}.
            </p>
          </div>
        } @else {
          @if (m.documentos.length > 1) {
            <app-message-document-tabs
              [documentos]="m.documentos"
              [selectedId]="selectedId()"
              (select)="selectDoc($event)"
            />
          }
          @if (selectedDoc(); as d) {
            <app-document-review
              [doc]="d"
              [caso]="caso()"
              [connection]="connection()"
              [message]="rawMessage()"
              (changed)="reload(true)"
            />
          }
        }
      }
    </div>

    @if (assignOpen() && message(); as m) {
      <app-assign-case-modal
        [title]="m.caso.case_id ? 'Mover a otro proceso' : 'Asignar a proceso'"
        [subtitle]="assignSubtitle()"
        [fromExpediente]="!!m.caso.case_id"
        [error]="assignError()"
        [submitting]="assignBusy()"
        (cancel)="assignOpen.set(false); assignError.set(null)"
        (confirm)="submitAssign($event)"
      />
    }
  `,
})
export class MessageDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly unassigned = inject(UnassignedService);
  private readonly destroyRef = inject(DestroyRef);

  readonly radicadoSourceLabel = radicadoSourceLabel;

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly message = signal<InboxMessageDetail | null>(null);
  readonly caso = signal<CaseDetail | null>(null);
  readonly connection = signal<EmailConnection | null>(null);
  /** Detalle del buzón: tamaño de los adjuntos. */
  readonly rawMessage = signal<MessageDetail | null>(null);
  readonly selectedId = signal<string | null>(null);

  readonly assignOpen = signal(false);
  readonly assignError = signal<string | null>(null);
  readonly assignBusy = signal(false);

  private messageId = '';
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private pollAttempts = 0;

  readonly selectedDoc = computed(() => {
    const m = this.message();
    if (!m) return null;
    const id = this.selectedId();
    return m.documentos_detalle.find((d) => d.attachment_id === id) ?? m.documentos_detalle[0] ?? null;
  });

  readonly assignSubtitle = computed(() => {
    const c = this.message()?.correo;
    return c ? [c.remitente, c.asunto].filter(Boolean).join(' · ') : '';
  });

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((q) => {
      this.selectedId.set(q.get('doc'));
    });
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((p) => {
      this.messageId = p.get('messageId') ?? '';
      this.message.set(null);
      this.rawMessage.set(null);
      this.connection.set(null);
      this.caso.set(null);
      this.pollAttempts = 0;
      void this.reload();
    });
    this.destroyRef.onDestroy(() => this.stopPoll());
  }

  /**
   * `silent`: recarga sin ocultar la vista. `refreshCase`: tras una acción el caso pudo cambiar
   * (radicado corregido, reasignación, respuesta), así que se vuelve a pedir.
   */
  async reload(silent = false, refreshCase = silent): Promise<void> {
    if (!this.messageId) {
      this.notFound();
      return;
    }
    this.stopPoll();
    if (!silent) {
      this.loading.set(true);
      this.loadError.set(null);
    }
    try {
      const m = await inboxApi.get(this.messageId);
      const prevCaseId = this.message()?.caso.case_id ?? null;
      this.message.set(m);
      await Promise.all([this.loadContext(m), this.loadCase(m.caso.case_id, prevCaseId, refreshCase)]);
      this.schedulePollIfPending(m);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        this.notFound();
        return;
      }
      if (silent) {
        this.toast.push({ type: 'error', title: errorText(e instanceof ApiError ? e.code : null), description: '' });
      } else {
        this.loadError.set(errorText(e instanceof ApiError ? e.code : null));
      }
    } finally {
      this.loading.set(false);
    }
  }

  selectDoc(attachmentId: string): void {
    this.selectedId.set(attachmentId);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { doc: attachmentId },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  goInbox(): void {
    void this.router.navigate(['/documents']);
  }

  async submitAssign(target: { case_id: string } | { radicado: string }): Promise<void> {
    this.assignBusy.set(true);
    this.assignError.set(null);
    try {
      const link = await caseFilesApi.assign(this.messageId, target);
      this.assignOpen.set(false);
      void this.unassigned.refresh();
      const rad = link.radicado ? formatRadicado(link.radicado) : '';
      this.toast.push({
        type: 'success',
        title: `Correo asignado al proceso ${rad}`.trim(),
        description: '',
      });
      await this.reload(true);
    } catch (e) {
      this.assignError.set(errorText(e instanceof ApiError ? e.code : null));
    } finally {
      this.assignBusy.set(false);
    }
  }

  /** Buzón y correo crudo: se cargan una vez por correo. */
  private async loadContext(m: InboxMessageDetail): Promise<void> {
    if (this.connection() && this.rawMessage()) return;
    const [conn, raw] = await Promise.all([
      integrationsApi.get(m.connection_id).catch(() => null),
      integrationsApi.message(m.connection_id, m.message_id).catch(() => null),
    ]);
    this.connection.set(conn);
    this.rawMessage.set(raw);
  }

  /** El caso puede cambiar al corregir un radicado o reasignar: recargar siempre en acciones. */
  private async loadCase(caseId: string | null, prevCaseId: string | null, force: boolean): Promise<void> {
    if (!caseId) {
      this.caso.set(null);
      return;
    }
    if (!force && caseId === prevCaseId && this.caso()) return;
    this.caso.set(await casesApi.get(caseId).catch(() => null));
  }

  private schedulePollIfPending(m: InboxMessageDetail): void {
    const pending = m.documentos_detalle.some((d) => d.document_status === 'pending');
    if (!pending || this.pollAttempts >= POLL_MAX) return;
    this.pollTimer = setTimeout(() => {
      this.pollAttempts += 1;
      void this.reload(true, false);
    }, POLL_MS);
  }

  private stopPoll(): void {
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.pollTimer = null;
  }

  private notFound(): void {
    this.toast.push({ type: 'error', title: 'Correo no encontrado', description: '' });
    void this.router.navigate(['/documents'], { replaceUrl: true });
  }
}
