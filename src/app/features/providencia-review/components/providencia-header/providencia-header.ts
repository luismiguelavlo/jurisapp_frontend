import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  documentStatusLabel,
  responseStatusLabel,
  reviewStatusLabel,
} from '../../../../core/api/document-labels';
import type { DocumentDetail } from '../../../../core/api/types';
import {
  formatBogotaDateTime,
  formatBytes,
  formatRadicado,
  relativeFromNow,
  remainingLabel,
} from '../../../../core/utils/date-format';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';

@Component({
  selector: 'app-providencia-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon, RouterLink],
  template: `
    <header
      class="bg-surface-container-lowest rounded-lg p-space-md flex flex-col gap-space-sm shadow-sm"
    >
      <div
        class="flex flex-wrap items-center justify-between gap-space-xs pb-space-xs border-b border-surface-container-high"
      >
        <div class="flex items-center gap-space-xs text-caption text-on-surface-variant flex-wrap">
          <a
            routerLink="/documents"
            class="hover:text-primary transition-colors no-underline text-inherit"
            >Bandeja</a
          >
          <span>/</span>
          <span>Providencias</span>
          <span>/</span>
          <span class="font-medium text-on-surface font-mono">{{ breadcrumb() }}</span>
        </div>
        <div class="flex items-center gap-space-xs text-caption text-on-surface-variant">
          <app-material-icon name="picture_as_pdf" [size]="16" className="text-error" />
          <span class="font-medium text-on-surface">{{ doc().filename }}</span>
          <span class="text-outline-variant">·</span>
          <span>{{ fileSizeLabel() }}</span>
          <span class="text-outline-variant">·</span>
          <span>{{ receivedLabel() }}</span>
        </div>
      </div>

      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div class="flex flex-wrap items-center gap-space-xs">
          <span
            class="inline-flex items-center gap-1.5 h-[24px] px-2 rounded-[6px] text-xs font-medium"
            [class]="extractionChipClass()"
          >
            <span class="w-1.5 h-1.5 rounded-full" [class]="extractionDot()"></span>
            Extracción: {{ documentStatusLabel(doc().document_status) }}
          </span>
          <span
            class="inline-flex items-center gap-1.5 h-[24px] px-2 rounded-[6px] text-xs font-medium"
            [class]="reviewChipClass()"
            [title]="reviewTooltip()"
          >
            <span class="w-1.5 h-1.5 rounded-full" [class]="reviewDot()"></span>
            Revisión: {{ reviewStatusLabel(doc().review_status) }}
          </span>
          <span
            class="inline-flex items-center gap-1.5 h-[24px] px-2 rounded-[6px] bg-surface-container text-xs font-medium text-on-surface-variant"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-outline"></span>
            Respuesta: {{ responseLabel() }}
          </span>
        </div>

        <div class="flex flex-wrap items-center gap-space-sm justify-between lg:justify-end">
          @if (deadlineBlock(); as dl) {
            <div class="flex items-center gap-2 px-3 py-1 rounded-[6px]" [class]="dl.tone">
              <app-material-icon name="timer" [size]="16" className="animate-pulse" />
              <div class="text-xs flex items-center gap-1">
                <span class="font-medium">Vence: {{ dl.when }}</span>
                @if (dl.remaining) {
                  <span class="font-semibold">· {{ dl.remaining }}</span>
                }
              </div>
            </div>
          }
          <div class="flex items-center gap-space-xs">
            <button
              type="button"
              class="h-9 px-3 rounded-[6px] bg-surface-container-lowest text-on-surface text-label-default hover:bg-surface-container-low transition-colors shadow-sm flex items-center gap-1 border-0 cursor-pointer disabled:opacity-40"
              [disabled]="!doc().case_id"
              (click)="viewCase.emit()"
            >
              <app-material-icon name="folder_open" [size]="16" />
              <span>Ver caso</span>
            </button>
            @if (canRecordResponse()) {
              <button
                type="button"
                class="h-9 px-3 rounded-[6px] bg-surface-container text-on-surface-variant text-label-default hover:bg-surface-container-high transition-colors flex items-center gap-1 border-0 cursor-pointer"
                (click)="recordResponse.emit()"
              >
                <app-material-icon name="reply" [size]="16" />
                <span>Registrar respuesta</span>
              </button>
            }
            @if (doc().document_status === 'extracted') {
              <button
                type="button"
                class="h-9 px-3.5 rounded-[6px] bg-primary text-on-primary text-label-default font-medium hover:bg-primary-container transition-colors shadow-sm flex items-center gap-1.5 border-0 cursor-pointer disabled:opacity-60"
                [disabled]="saving()"
                (click)="confirm.emit()"
              >
                <app-material-icon
                  [name]="saving() ? 'refresh' : 'check_circle'"
                  [size]="16"
                  [className]="saving() ? 'animate-spin' : ''"
                />
                <span>{{ saving() ? 'Guardando…' : dirty() ? 'Guardar cambios' : 'Confirmar datos' }}</span>
              </button>
            }
          </div>
        </div>
      </div>
    </header>
  `,
})
export class ProvidenciaHeader {
  readonly documentStatusLabel = documentStatusLabel;
  readonly reviewStatusLabel = reviewStatusLabel;

  readonly doc = input.required<DocumentDetail>();
  readonly fileSizeBytes = input<number | null>(null);
  readonly dirty = input(false);
  readonly saving = input(false);

  readonly confirm = output<void>();
  readonly viewCase = output<void>();
  readonly recordResponse = output<void>();

  readonly breadcrumb = computed(() => {
    const r = this.doc().fields?.radicado?.valor?.normalizado;
    return r ? formatRadicado(r) : this.doc().filename;
  });

  readonly fileSizeLabel = computed(() => formatBytes(this.fileSizeBytes()));

  readonly receivedLabel = computed(() => {
    const iso = this.doc().correo.recibido_at;
    const rel = relativeFromNow(iso);
    return rel ? `Recibido ${rel}` : 'Recibido';
  });

  readonly responseLabel = computed(() =>
    responseStatusLabel(this.doc().respuesta_estado, this.doc().a_tiempo),
  );

  readonly canRecordResponse = computed(() => {
    const e = this.doc().respuesta_estado;
    return e === 'pendiente' || e === 'vencido_sin_respuesta';
  });

  readonly deadlineBlock = computed(() => {
    const d = this.doc();
    if (!d.vence_at || d.respuesta_estado === 'respondido') return null;
    const remaining = remainingLabel(d.vence_at);
    const ms = new Date(d.vence_at).getTime() - Date.now();
    const hours = ms / 3_600_000;
    let tone = 'bg-surface-container text-on-surface-variant';
    if (hours <= 24) tone = 'bg-[#FEF2F2] text-[#991B1B]';
    else if (hours <= 72) tone = 'bg-[#FFFBEB] text-[#92400E]';
    return { when: formatBogotaDateTime(d.vence_at), remaining, tone };
  });

  extractionChipClass(): string {
    const s = this.doc().document_status;
    if (s === 'extracted') return 'bg-[#F0FDF4] text-[#166534]';
    if (s === 'needs_ocr' || s === 'pending') return 'bg-[#FFFBEB] text-[#92400E]';
    if (s === 'failed') return 'bg-[#FEE2E2] text-[#991B1B]';
    return 'bg-surface-container text-on-surface-variant';
  }

  extractionDot(): string {
    const s = this.doc().document_status;
    if (s === 'extracted') return 'bg-[#16A34A]';
    if (s === 'failed') return 'bg-[#EF4444]';
    return 'bg-[#D97706]';
  }

  reviewChipClass(): string {
    return this.doc().review_status === 'unreviewed'
      ? 'bg-[#FFFBEB] text-[#92400E]'
      : 'bg-[#F0FDF4] text-[#166534]';
  }

  reviewDot(): string {
    return this.doc().review_status === 'unreviewed' ? 'bg-[#D97706]' : 'bg-[#16A34A]';
  }

  reviewTooltip(): string {
    const lr = this.doc().last_review;
    return lr ? `Revisado ${formatBogotaDateTime(lr.reviewed_at)}` : '';
  }
}
