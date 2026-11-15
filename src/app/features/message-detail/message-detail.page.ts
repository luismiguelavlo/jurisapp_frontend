import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiError } from '../../core/api/client';
import { caseFilesApi, casesApi, inboxApi, integrationsApi } from '../../core/api/endpoints';
import { errorText } from '../../core/api/errors';
import type {
  EmailConnection,
  InboxMessageDetail,
  MessageAnalysis,
  MessageDetail,
  ResponseMedium,
} from '../../core/api/types';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { UnassignedService } from '../../core/services/unassigned.service';
import { UserDirectoryService } from '../../core/services/user-directory.service';
import { displayName } from '../../core/utils/person-name';
import { formatRadicado } from '../../core/utils/date-format';
import { radicadoSourceLabel } from '../../core/api/document-labels';
import { AssignCaseModal } from '../cases/components/assign-case-modal/assign-case-modal';
import { RecordResponseModal } from '../providencia-review/components/record-response-modal/record-response-modal';
import { MessageDocumentsPanel } from '../message-ficha/components/message-documents-panel/message-documents-panel';
import type { DocumentPageRef } from '../message-ficha/ficha-ui';
import { MessageFicha } from '../message-ficha/message-ficha';
import { MessageDetailHeader } from './components/message-detail-header/message-detail-header';
import { ReassignMessageDialog } from './components/reassign-message-dialog/reassign-message-dialog';

const POLL_MS = 5000;
const POLL_MAX = 60;

/**
 * Detalle de un correo (`GET /messages/{id}`): UNA ficha unificada con lo que dicen el cuerpo y
 * todos sus documentos juntos, y al lado todos los documentos del correo con su visor.
 * `?doc=<attachment_id>` abre ese documento en el visor.
 */
@Component({
  selector: 'app-message-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MessageDetailHeader,
    MessageFicha,
    MessageDocumentsPanel,
    AssignCaseModal,
    RecordResponseModal,
    ReassignMessageDialog,
  ],
  template: `
    <div
      class="max-w-[1480px] w-full mx-auto px-margin-tablet lg:px-margin-desktop py-space-md flex flex-col gap-space-md"
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
          [canAssign]="auth.canEdit()"
          [canReassign]="auth.canReassign()"
          [reassignedBy]="reassignedBy()"
          (back)="goInbox()"
          (assign)="assignOpen.set(true)"
          (reassign)="openReassign()"
        />

        <div class="grid grid-cols-1 xl:grid-cols-12 gap-space-md items-start">
          <section class="xl:col-span-7 min-w-0">
            <app-message-ficha
              [state]="m.analisis"
              [documentosCount]="m.documentos_count"
              [recibidoAt]="m.correo.recibido_at"
              [remitente]="m.correo.remitente"
              [saving]="saving()"
              [readOnly]="!auth.canEdit()"
              (save)="onSave($event)"
              (reanalyze)="onReanalyze()"
              (openPage)="openPage($event)"
            />
          </section>
          <aside class="xl:col-span-5 min-w-0 xl:sticky xl:top-16">
            @if (m.documentos_detalle.length) {
              <app-message-documents-panel
                [documentos]="m.documentos_detalle"
                [fuentes]="m.analisis.ficha?.documentos ?? []"
                [rawMessage]="rawMessage()"
                [selectedId]="selectedId()"
                [page]="page()"
                [canRespond]="auth.canEdit()"
                (selectDoc)="selectDoc($event)"
                (pageChange)="page.set($event)"
                (recordResponse)="responseFor.set($event)"
              />
            } @else {
              <div class="bg-surface-container-lowest rounded-xl shadow-sm px-6 py-8">
                <p class="m-0 text-body-default text-on-surface-variant">
                  Este correo no trae documentos; se asoció al caso por
                  {{ radicadoSourceLabel(m.caso.radicado_source) }}.
                </p>
              </div>
            }
          </aside>
        </div>
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

    @if (reassignOpen() && message(); as m) {
      <app-reassign-message-dialog
        [users]="directory.active()"
        [current]="m.asignacion"
        [subtitle]="assignSubtitle()"
        [error]="reassignError()"
        [submitting]="reassignBusy()"
        (cancel)="reassignOpen.set(false); reassignError.set(null)"
        (confirm)="submitReassign($event)"
      />
    }

    @if (responseFor()) {
      <app-record-response-modal (cancel)="responseFor.set(null)" (save)="onRecordResponse($event)" />
    }
  `,
})
export class MessageDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly unassigned = inject(UnassignedService);
  readonly auth = inject(AuthService);
  readonly directory = inject(UserDirectoryService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ficha = viewChild(MessageFicha);

  readonly radicadoSourceLabel = radicadoSourceLabel;

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly message = signal<InboxMessageDetail | null>(null);
  readonly connection = signal<EmailConnection | null>(null);
  /** Detalle del buzón: tamaño de los adjuntos y cuerpo del correo. */
  readonly rawMessage = signal<MessageDetail | null>(null);
  readonly selectedId = signal<string | null>(null);
  readonly page = signal(1);
  readonly saving = signal(false);
  readonly responseFor = signal<string | null>(null);

  readonly assignOpen = signal(false);
  readonly assignError = signal<string | null>(null);
  readonly assignBusy = signal(false);

  readonly reassignOpen = signal(false);
  readonly reassignError = signal<string | null>(null);
  readonly reassignBusy = signal(false);

  /** Nombre de quien reasignó el correo a mano. */
  readonly reassignedBy = computed(() => {
    const by = this.message()?.asignacion?.asignado_por;
    return by ? (this.directory.names().get(by) ?? null) : null;
  });

  private messageId = '';
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private pollAttempts = 0;

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
      this.pollAttempts = 0;
      void this.reload();
    });
    this.destroyRef.onDestroy(() => this.stopPoll());
    void this.directory.ensureLoaded();
  }

  openReassign(): void {
    this.reassignError.set(null);
    this.reassignOpen.set(true);
    void this.directory.refresh();
  }

  async submitReassign(userId: string): Promise<void> {
    this.reassignBusy.set(true);
    this.reassignError.set(null);
    try {
      const updated = await inboxApi.assign(this.messageId, userId);
      this.apply(updated);
      this.reassignOpen.set(false);
      const a = updated.asignacion;
      this.toast.push({
        type: 'success',
        title: a ? `Correo asignado a ${displayName(a)}` : 'Correo asignado',
        description: '',
      });
    } catch (e) {
      const code = e instanceof ApiError ? e.code : null;
      if (code === 'assignee_not_found') void this.directory.refresh();
      this.reassignError.set(errorText(code));
    } finally {
      this.reassignBusy.set(false);
    }
  }

  async reload(silent = false): Promise<void> {
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
      this.apply(m);
      await this.loadContext(m);
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

  private apply(m: InboxMessageDetail): void {
    this.message.set(m);
    this.schedulePollIfPending(m);
  }

  selectDoc(attachmentId: string, page = 1): void {
    this.selectedId.set(attachmentId);
    this.page.set(page);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { doc: attachmentId },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  openPage(ref: DocumentPageRef): void {
    this.selectDoc(ref.attachment_id, ref.pagina);
  }

  goInbox(): void {
    void this.router.navigate(['/documents']);
  }

  async onSave(ficha: MessageAnalysis): Promise<void> {
    const m = this.message();
    const analysisId = m?.analisis.analysis_id;
    if (!m || !analysisId) return;
    this.saving.set(true);
    try {
      let updated = await inboxApi.review(this.messageId, analysisId, ficha);
      // Un radicado corregido en la ficha mueve el correo (y todos sus documentos) a ese proceso.
      const radicado = ficha.identificacion.radicado;
      if (radicado && radicado !== m.caso.radicado && (radicado.length === 23 || radicado.length === 21)) {
        await caseFilesApi.assign(this.messageId, { radicado });
        void this.unassigned.refresh();
        updated = await inboxApi.get(this.messageId);
      }
      this.ficha()?.markSaved(updated.analisis.ficha);
      this.apply(updated);
      this.toast.push({ type: 'success', title: 'Datos confirmados', description: '' });
    } catch (e) {
      const code = e instanceof ApiError ? e.code : null;
      this.toast.push({ type: 'error', title: errorText(code), description: '' });
    } finally {
      this.saving.set(false);
    }
  }

  async onReanalyze(): Promise<void> {
    try {
      const m = await inboxApi.reanalyze(this.messageId);
      this.pollAttempts = 0;
      this.apply(m);
      this.toast.push({ type: 'success', title: 'Reanálisis solicitado', description: '' });
    } catch (e) {
      this.toast.push({ type: 'error', title: errorText(e instanceof ApiError ? e.code : null), description: '' });
    }
  }

  async onRecordResponse(body: { responded_at: string; medio?: ResponseMedium; referencia?: string }): Promise<void> {
    const attachmentId = this.responseFor();
    if (!attachmentId) return;
    try {
      await casesApi.recordResponse(attachmentId, body);
      this.responseFor.set(null);
      this.toast.push({ type: 'success', title: 'Respuesta registrada', description: '' });
      await this.reload(true);
    } catch (e) {
      this.toast.push({ type: 'error', title: errorText(e instanceof ApiError ? e.code : null), description: '' });
    }
  }

  async submitAssign(target: { case_id: string } | { radicado: string }): Promise<void> {
    this.assignBusy.set(true);
    this.assignError.set(null);
    try {
      const link = await caseFilesApi.assign(this.messageId, target);
      this.assignOpen.set(false);
      void this.unassigned.refresh();
      const rad = link.radicado ? formatRadicado(link.radicado) : '';
      this.toast.push({ type: 'success', title: `Correo asignado al proceso ${rad}`.trim(), description: '' });
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
      // El auxiliar no ve los buzones (403, SPEC 24); sí el detalle de su correo.
      this.auth.isScoped() ? Promise.resolve(null) : integrationsApi.get(m.connection_id).catch(() => null),
      integrationsApi.message(m.connection_id, m.message_id).catch(() => null),
    ]);
    this.connection.set(conn);
    this.rawMessage.set(raw);
  }

  /** Mientras haya documentos procesándose o el correo se esté analizando. */
  private schedulePollIfPending(m: InboxMessageDetail): void {
    const pending =
      m.documentos_detalle.some((d) => d.document_status === 'pending') ||
      m.analisis.estado === 'pendiente' ||
      m.analisis.estado === 'analizando';
    if (!pending || this.pollAttempts >= POLL_MAX) return;
    this.pollTimer = setTimeout(() => {
      this.pollAttempts += 1;
      void this.reload(true);
    }, POLL_MS);
  }

  private stopPoll(): void {
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.pollTimer = null;
  }

  private notFound(): void {
    // Un auxiliar recibe 404 en un correo que ya no tiene asignado (SPEC 24).
    this.toast.push(
      this.auth.isScoped()
        ? { type: 'error', title: 'Este correo no está asignado a ti', description: 'Puede que lo hayan reasignado.' }
        : { type: 'error', title: 'Correo no encontrado', description: '' },
    );
    void this.router.navigate(['/documents'], { replaceUrl: true });
  }
}
