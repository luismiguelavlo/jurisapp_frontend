import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { Router } from '@angular/router';
import { ApiError } from '../../../../core/api/client';
import { casesApi, documentsApi } from '../../../../core/api/endpoints';
import { errorText } from '../../../../core/api/errors';
import type {
  CaseDetail,
  DocumentDetail,
  DocumentFields,
  EmailConnection,
  MessageDetail,
  PageText,
  Parte,
  ResponseMedium,
} from '../../../../core/api/types';
import { ToastService } from '../../../../core/services/toast.service';
import {
  formatBogotaDateTime,
  normalizeRadicadoInput,
} from '../../../../core/utils/date-format';
import { pendingFieldKeys, pendingFieldLabels } from '../../utils/pending-fields';
import { DocumentAnalysisPanel } from '../document-analysis-panel/document-analysis-panel';
import { EmailOriginCard } from '../email-origin-card/email-origin-card';
import {
  ExtractedDataForm,
  fieldsToForm,
  type FormFields,
} from '../extracted-data-form/extracted-data-form';
import { PdfViewer } from '../pdf-viewer/pdf-viewer';
import { ProcessAssociationCard } from '../process-association-card/process-association-card';
import { ProvidenciaHeader } from '../providencia-header/providencia-header';
import { RecordResponseModal } from '../record-response-modal/record-response-modal';
import { ReviewActionBar } from '../review-action-bar/review-action-bar';
import { ReviewAlertBanner } from '../review-alert-banner/review-alert-banner';

/**
 * Identificación de una providencia: PDF, datos extraídos, análisis, proceso y respuesta.
 * Recibe el `DocumentDetail` ya cargado; tras guardar o registrar respuesta emite `changed`
 * para que el contenedor recargue (el caso del correo puede cambiar).
 */
@Component({
  selector: 'app-document-review',
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
    @let d = doc();
    <div class="flex flex-col gap-space-md">
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
          @if (showOrigin()) {
            <app-email-origin-card
              [correo]="d.correo"
              [connection]="connection()"
              [message]="message()"
            />
          }

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
    </div>

    @if (responseOpen()) {
      <app-record-response-modal
        (cancel)="responseOpen.set(false)"
        (save)="onRecordResponse($event)"
      />
    }
  `,
})
export class DocumentReview {
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly doc = input.required<DocumentDetail>();
  readonly caso = input<CaseDetail | null>(null);
  readonly connection = input<EmailConnection | null>(null);
  readonly message = input<MessageDetail | null>(null);
  /** El detalle del correo ya muestra el origen en su cabecera. */
  readonly showOrigin = input(false);
  /** Se guardó la revisión o se registró una respuesta: recargar. */
  readonly changed = output<void>();

  readonly pageTexts = signal<PageText[]>([]);
  readonly pdfData = signal<ArrayBuffer | null>(null);
  readonly pdfBlob = signal<Blob | null>(null);
  readonly form = signal<FormFields | null>(null);
  readonly baseline = signal<FormFields | null>(null);

  readonly currentPage = signal(1);
  readonly zoom = signal(100);
  readonly saving = signal(false);
  readonly responseOpen = signal(false);

  private pdfFor: string | null = null;

  constructor() {
    effect(() => {
      const d = this.doc();
      untracked(() => {
        const form = fieldsToForm(d.fields);
        this.form.set(form);
        this.baseline.set(structuredClone(form));
        if (this.pdfFor !== d.attachment_id) {
          this.pdfFor = d.attachment_id;
          this.currentPage.set(1);
          this.pdfData.set(null);
          this.pdfBlob.set(null);
          this.pageTexts.set([]);
          void this.loadPdfAndText(d);
        }
      });
    });
  }

  readonly pendingLabels = computed(() => pendingFieldLabels(this.doc()));

  readonly showBanner = computed(
    () => this.doc().review_status === 'unreviewed' && this.pendingLabels().length > 0,
  );

  readonly dirty = computed(() => {
    const f = this.form();
    const b = this.baseline();
    if (!f || !b) return false;
    return JSON.stringify(f) !== JSON.stringify(b);
  });

  readonly fileSizeBytes = computed(() => {
    const msg = this.message();
    if (!msg) return null;
    return msg.attachments.find((a) => a.id === this.doc().attachment_id)?.size_bytes ?? null;
  });

  readonly deadlineLabel = computed(() => {
    const v = this.doc().vence_at;
    return v ? formatBogotaDateTime(v) : null;
  });

  readonly statusMessage = computed(() => {
    const d = this.doc();
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

  private async loadPdfAndText(doc: DocumentDetail): Promise<void> {
    try {
      const [blob, texts] = await Promise.all([
        documentsApi.pdf(doc),
        documentsApi.text(doc.attachment_id).catch(() => [] as PageText[]),
      ]);
      if (this.pdfFor !== doc.attachment_id) return;
      this.pdfBlob.set(blob);
      this.pdfData.set(await blob.arrayBuffer());
      this.pageTexts.set(texts);
    } catch {
      if (this.pdfFor !== doc.attachment_id) return;
      this.toast.push({ type: 'error', title: 'No se pudo cargar el PDF', description: '' });
    }
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
    const keys = pendingFieldKeys(this.doc());
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
    const id = this.doc().case_id;
    if (id) void this.router.navigate(['/cases', id]);
  }

  goCaseProfile(caseId: string): void {
    void this.router.navigate(['/cases', caseId], { queryParams: { tab: 'ficha' } });
  }

  downloadPdf(): void {
    const blob = this.pdfBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.doc().filename;
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
    if (!f || this.saving()) return;
    this.saving.set(true);
    try {
      const updated = await documentsApi.review(d.attachment_id, this.buildChanges(f));
      const form = fieldsToForm(updated.fields);
      this.form.set(form);
      this.baseline.set(structuredClone(form));
      this.toast.push({ type: 'success', title: 'Datos confirmados', description: '' });
      this.changed.emit();
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        this.toast.push({ type: 'error', title: 'Permisos insuficientes', description: '' });
      } else if (e instanceof ApiError) {
        this.toast.push({ type: 'error', title: errorText(e.code), description: '' });
        if (e.code === 'document_not_extracted') this.changed.emit();
      } else {
        this.toast.push({ type: 'error', title: errorText(null), description: '' });
      }
    } finally {
      this.saving.set(false);
    }
  }

  async onRecordResponse(body: {
    responded_at: string;
    medio?: ResponseMedium;
    referencia?: string;
  }): Promise<void> {
    try {
      await casesApi.recordResponse(this.doc().attachment_id, body);
      this.responseOpen.set(false);
      this.toast.push({ type: 'success', title: 'Respuesta registrada', description: '' });
      this.changed.emit();
    } catch (e) {
      this.toast.push({
        type: 'error',
        title: errorText(e instanceof ApiError ? e.code : null),
        description: '',
      });
    }
  }

  private buildChanges(form: FormFields): Partial<Record<keyof DocumentFields, unknown>> {
    const orig = this.baseline();
    if (!orig || JSON.stringify(form) === JSON.stringify(orig)) return {};

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

    return changes;
  }
}
