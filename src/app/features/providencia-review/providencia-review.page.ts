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
import { casesApi, documentsApi, integrationsApi } from '../../core/api/endpoints';
import { errorText } from '../../core/api/errors';
import type {
  CaseDetail,
  DocumentDetail,
  DocumentFields,
  EmailConnection,
  MessageDetail,
  PageText,
  Parte,
} from '../../core/api/types';
import { ToastService } from '../../core/services/toast.service';
import {
  formatBogotaDateTime,
  normalizeRadicadoInput,
} from '../../core/utils/date-format';
import { DocumentAnalysisPanel } from './components/document-analysis-panel/document-analysis-panel';
import { EmailOriginCard } from './components/email-origin-card/email-origin-card';
import {
  ExtractedDataForm,
  fieldsToForm,
  type FormFields,
} from './components/extracted-data-form/extracted-data-form';
import { PdfViewer } from './components/pdf-viewer/pdf-viewer';
import { ProcessAssociationCard } from './components/process-association-card/process-association-card';
import { ProvidenciaHeader } from './components/providencia-header/providencia-header';
import { RecordResponseModal } from './components/record-response-modal/record-response-modal';
import { ReviewActionBar } from './components/review-action-bar/review-action-bar';
import { ReviewAlertBanner } from './components/review-alert-banner/review-alert-banner';
import { pendingFieldKeys, pendingFieldLabels } from './utils/pending-fields';

@Component({
  selector: 'app-providencia-review-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReviewAlertBanner,
    ProvidenciaHeader,
    PdfViewer,
    EmailOriginCard,
    ExtractedDataForm,
    ProcessAssociationCard,
    ReviewActionBar,
    RecordResponseModal,
    DocumentAnalysisPanel,
  ],
  template: `
    <div class="flex flex-col w-full">
      <div
        class="max-w-[1120px] w-full mx-auto px-margin-tablet lg:px-margin-desktop py-space-md flex flex-col gap-space-md"
      >
        @if (loading()) {
          <p class="text-body-default text-on-surface-variant">Cargando providencia…</p>
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
        } @else if (doc(); as d) {
          @if (showBanner()) {
            <app-review-alert-banner
              [pendingLabels]="pendingLabels()"
              (jumpToPending)="scrollToFirstPending()"
            />
          }

          <app-providencia-header
            [doc]="d"
            [fileSizeBytes]="fileSizeBytes()"
            [dirty]="dirty()"
            [saving]="saving()"
            (confirm)="onConfirm()"
            (viewCase)="goCase()"
            (recordResponse)="responseOpen.set(true)"
          />

          @if (d.document_status !== 'extracted') {
            <div class="p-space-md rounded-lg bg-surface-container-low text-on-surface">
              {{ statusMessage() }}
            </div>
          }

          <div class="grid grid-cols-1 lg:grid-cols-12 gap-space-md items-start">
            <section class="lg:col-span-5 flex flex-col gap-space-sm sticky top-16">
              <app-pdf-viewer
                [pdfData]="pdfData()"
                [pageTexts]="pageTexts()"
                [currentPage]="currentPage()"
                [zoom]="zoom()"
                [extractorVersion]="d.extractor_version"
                [pageCountHint]="d.page_count"
                (pageChange)="currentPage.set($event)"
                (zoomChange)="adjustZoom($event)"
                (locateField)="scrollToFirstPending()"
                (download)="downloadPdf()"
              />
            </section>

            <section class="lg:col-span-7 flex flex-col gap-space-md">
              <app-email-origin-card
                [correo]="d.correo"
                [connection]="connection()"
                [message]="message()"
              />

              @if (d.analysis; as an) {
                <app-document-analysis-panel
                  [analysis]="an"
                  [caseId]="d.case_id"
                  (openCaseProfile)="goCaseProfile($event)"
                />
              }

              @if (d.document_status === 'extracted' && form(); as f) {
                <app-extracted-data-form
                  [doc]="d"
                  [form]="f"
                  [deadlineLabel]="deadlineLabel()"
                  (formChange)="onFormPatch($event)"
                  (confirmAll)="onConfirm()"
                  (goPage)="currentPage.set($event)"
                  (addParty)="onAddParty()"
                  (removeParty)="onRemoveParty($event)"
                />

                <app-process-association-card
                  [doc]="d"
                  [caso]="caso()"
                  [draftRadicado]="f.radicadoDisplay"
                  (draftRadicadoChange)="onFormPatch({ radicadoDisplay: $event })"
                  (saveRadicado)="onConfirm()"
                />

                <app-review-action-bar
                  [dirty]="dirty()"
                  [saving]="saving()"
                  [extractorVersion]="d.extractor_version"
                  (confirm)="onConfirm()"
                  (discard)="onDiscard()"
                />
              }
            </section>
          </div>
        }
      </div>

      @if (responseOpen()) {
        <app-record-response-modal
          (cancel)="responseOpen.set(false)"
          (save)="onRecordResponse($event)"
        />
      }
    </div>
  `,
})
export class ProvidenciaReviewPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly doc = signal<DocumentDetail | null>(null);
  readonly caso = signal<CaseDetail | null>(null);
  readonly connection = signal<EmailConnection | null>(null);
  readonly message = signal<MessageDetail | null>(null);
  readonly pageTexts = signal<PageText[]>([]);
  readonly pdfData = signal<ArrayBuffer | null>(null);
  readonly pdfBlob = signal<Blob | null>(null);
  readonly form = signal<FormFields | null>(null);
  readonly baseline = signal<FormFields | null>(null);

  readonly currentPage = signal(1);
  readonly zoom = signal(100);
  readonly saving = signal(false);
  readonly responseOpen = signal(false);

  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private attachmentId = '';

  readonly pendingLabels = computed(() => {
    const d = this.doc();
    return d ? pendingFieldLabels(d) : [];
  });

  readonly showBanner = computed(() => {
    const d = this.doc();
    return !!d && d.review_status === 'unreviewed' && this.pendingLabels().length > 0;
  });

  readonly dirty = computed(() => {
    const f = this.form();
    const b = this.baseline();
    if (!f || !b) return false;
    return JSON.stringify(f) !== JSON.stringify(b);
  });

  readonly fileSizeBytes = computed(() => {
    const d = this.doc();
    const msg = this.message();
    if (!d || !msg) return null;
    return msg.attachments.find((a) => a.id === d.attachment_id)?.size_bytes ?? null;
  });

  readonly deadlineLabel = computed(() => {
    const v = this.doc()?.vence_at;
    return v ? formatBogotaDateTime(v) : null;
  });

  readonly statusMessage = computed(() => {
    const d = this.doc();
    if (!d) return '';
    switch (d.document_status) {
      case 'pending':
        return 'Procesando…';
      case 'needs_ocr':
        return 'PDF escaneado sin texto legible';
      case 'failed':
        return errorText(d.error_code);
      default:
        return 'Documento aún no extraído';
    }
  });

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.attachmentId = params.get('id') ?? '';
      void this.reload();
    });
    this.destroyRef.onDestroy(() => {
      if (this.pollTimer) clearTimeout(this.pollTimer);
    });
  }

  async reload(): Promise<void> {
    if (!this.attachmentId) {
      this.loadError.set('Providencia no encontrada');
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.loadError.set(null);
    try {
      const doc = await documentsApi.get(this.attachmentId);
      this.doc.set(doc);
      const form = fieldsToForm(doc.fields);
      this.form.set(form);
      this.baseline.set(structuredClone(form));

      const [msg, conn, caso] = await Promise.all([
        integrationsApi.message(doc.connection_id, doc.message_id).catch(() => null),
        integrationsApi.get(doc.connection_id).catch(() => null),
        doc.case_id ? casesApi.get(doc.case_id).catch(() => null) : Promise.resolve(null),
      ]);
      this.message.set(msg);
      this.connection.set(conn);
      this.caso.set(caso);

      void this.loadPdfAndText(doc);

      if (doc.document_status === 'pending') {
        this.schedulePoll();
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        this.loadError.set('Providencia no encontrada');
      } else {
        this.loadError.set(errorText(e instanceof ApiError ? e.code : null));
      }
    } finally {
      this.loading.set(false);
    }
  }

  private async loadPdfAndText(doc: DocumentDetail): Promise<void> {
    try {
      const [blob, texts] = await Promise.all([
        documentsApi.pdf(doc),
        documentsApi.text(doc.attachment_id).catch(() => [] as PageText[]),
      ]);
      this.pdfBlob.set(blob);
      this.pdfData.set(await blob.arrayBuffer());
      this.pageTexts.set(texts);
    } catch {
      this.toast.push({ type: 'error', title: 'No se pudo cargar el PDF', description: '' });
    }
  }

  private schedulePoll(): void {
    if (this.pollTimer) clearTimeout(this.pollTimer);
    let attempts = 0;
    const tick = async () => {
      attempts += 1;
      if (attempts > 24) return;
      try {
        const doc = await documentsApi.get(this.attachmentId);
        this.doc.set(doc);
        if (doc.document_status === 'extracted') {
          const form = fieldsToForm(doc.fields);
          this.form.set(form);
          this.baseline.set(structuredClone(form));
          if (doc.case_id) this.caso.set(await casesApi.get(doc.case_id).catch(() => null));
          return;
        }
        if (doc.document_status === 'pending') {
          this.pollTimer = setTimeout(() => void tick(), 5000);
        }
      } catch {
        /* ignore */
      }
    };
    this.pollTimer = setTimeout(() => void tick(), 5000);
  }

  adjustZoom(delta: number): void {
    this.zoom.update((z) => Math.min(Math.max(z + delta, 60), 160));
  }

  onFormPatch(partial: Partial<FormFields>): void {
    this.form.update((f) => (f ? { ...f, ...partial } : f));
  }

  onDiscard(): void {
    const b = this.baseline();
    if (b) this.form.set(structuredClone(b));
  }

  scrollToFirstPending(): void {
    const d = this.doc();
    if (!d) return;
    const keys = pendingFieldKeys(d);
    const first = keys[0] ?? 'radicado';
    const idMap: Record<string, string> = {
      radicado: 'field-radicado',
      tipo_providencia: 'field-tipo',
      fecha_providencia: 'field-fecha',
      juzgado: 'field-juzgado',
      correo_juzgado: 'field-juzgado',
      termino_contestar: 'field-termino',
      partes: 'field-partes',
    };
    const el = document.getElementById(idMap[first] ?? 'field-radicado');
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  goCase(): void {
    const id = this.doc()?.case_id;
    if (id) void this.router.navigate(['/cases', id]);
  }

  goCaseProfile(caseId: string): void {
    void this.router.navigate(['/cases', caseId], { queryParams: { tab: 'ficha' } });
  }

  downloadPdf(): void {
    const blob = this.pdfBlob();
    const d = this.doc();
    if (!blob || !d) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = d.filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  onAddParty(): void {
    const name = window.prompt('Nombre de la nueva parte:');
    if (!name?.trim()) return;
    this.form.update((f) => {
      if (!f) return f;
      const party: Parte = {
        rol: 'vinculado',
        nombre: name.trim(),
        confianza: 'alta',
        pagina: null,
        identificacion: null,
      };
      return { ...f, partes: [...f.partes, party] };
    });
  }

  onRemoveParty(index: number): void {
    this.form.update((f) => {
      if (!f) return f;
      return { ...f, partes: f.partes.filter((_, i) => i !== index) };
    });
  }

  async onConfirm(): Promise<void> {
    const d = this.doc();
    const f = this.form();
    if (!d || !f || this.saving()) return;
    this.saving.set(true);
    try {
      const changes = this.buildChanges(f);
      const updated = await documentsApi.review(d.attachment_id, changes);
      this.doc.set(updated);
      const form = fieldsToForm(updated.fields);
      this.form.set(form);
      this.baseline.set(structuredClone(form));
      if (updated.case_id) {
        this.caso.set(await casesApi.get(updated.case_id).catch(() => null));
      } else {
        this.caso.set(null);
      }
      this.toast.push({ type: 'success', title: 'Datos confirmados', description: '' });
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        this.toast.push({ type: 'error', title: 'Permisos insuficientes', description: '' });
      } else if (e instanceof ApiError) {
        this.toast.push({ type: 'error', title: errorText(e.code), description: '' });
        if (e.code === 'document_not_extracted') void this.reload();
      } else {
        this.toast.push({ type: 'error', title: errorText(null), description: '' });
      }
    } finally {
      this.saving.set(false);
    }
  }

  async onRecordResponse(body: {
    responded_at: string;
    medio?: import('../../core/api/types').ResponseMedium;
    referencia?: string;
  }): Promise<void> {
    const d = this.doc();
    if (!d) return;
    try {
      await casesApi.recordResponse(d.attachment_id, body);
      this.responseOpen.set(false);
      this.toast.push({ type: 'success', title: 'Respuesta registrada', description: '' });
      await this.reload();
    } catch (e) {
      if (e instanceof ApiError) {
        this.toast.push({ type: 'error', title: errorText(e.code), description: '' });
      } else {
        this.toast.push({ type: 'error', title: errorText(null), description: '' });
      }
    }
  }

  private buildChanges(
    form: FormFields,
  ): Partial<Record<keyof DocumentFields, unknown>> {
    const orig = this.baseline();
    if (!orig) return {};
    if (JSON.stringify(form) === JSON.stringify(orig) && !this.dirty()) {
      return {};
    }

    const changes: Partial<Record<keyof DocumentFields, unknown>> = {};

    const radDigits = normalizeRadicadoInput(form.radicadoDisplay);
    const origRad = normalizeRadicadoInput(orig.radicadoDisplay);
    if (radDigits !== origRad) {
      changes.radicado = radDigits ? { normalizado: radDigits } : null;
    }

    if (form.clase !== orig.clase || form.subtipo !== orig.subtipo) {
      if (!form.clase) changes.tipo_providencia = null;
      else {
        changes.tipo_providencia = {
          clase: form.clase,
          subtipo: form.clase === 'desconocido' ? null : form.subtipo || null,
        };
      }
    }

    if (form.fecha !== orig.fecha) {
      changes.fecha_providencia = form.fecha || null;
    }

    if (
      form.juzgadoNombre !== orig.juzgadoNombre ||
      form.juzgadoNumero !== orig.juzgadoNumero ||
      form.especialidad !== orig.especialidad ||
      form.categoria !== orig.categoria ||
      form.ciudad !== orig.ciudad ||
      form.departamento !== orig.departamento
    ) {
      if (!form.juzgadoNombre.trim()) changes.juzgado = null;
      else {
        changes.juzgado = {
          nombre: form.juzgadoNombre.trim(),
          numero: form.juzgadoNumero ? Number(form.juzgadoNumero) : null,
          especialidad: form.especialidad || null,
          categoria: form.categoria || null,
          ciudad: form.ciudad || null,
          departamento: form.departamento || null,
        };
      }
    }

    if (form.correoJuzgado !== orig.correoJuzgado) {
      changes.correo_juzgado = form.correoJuzgado.trim() || null;
    }

    if (
      form.terminoCantidad !== orig.terminoCantidad ||
      form.terminoUnidad !== orig.terminoUnidad
    ) {
      if (form.terminoCantidad == null || !form.terminoUnidad) {
        changes.termino_contestar = null;
      } else {
        changes.termino_contestar = {
          cantidad: form.terminoCantidad,
          unidad: form.terminoUnidad,
          texto: form.terminoTexto,
        };
      }
    }

    if (JSON.stringify(form.partes) !== JSON.stringify(orig.partes)) {
      changes.partes = form.partes.map((p) => ({
        rol: p.rol,
        nombre: p.nombre,
        identificacion:
          p.identificacion && p.identificacion.fuente !== 'catalogo'
            ? { tipo: p.identificacion.tipo, numero: p.identificacion.numero }
            : null,
      }));
    }

    // Confirm vacío si no hay cambios reales
    if (Object.keys(changes).length === 0) return {};
    return changes;
  }
}
