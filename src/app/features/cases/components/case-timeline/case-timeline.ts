import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  providenciaTitle,
  responseStatusLabel,
} from '../../../../core/api/document-labels';
import type { TimelineEntry } from '../../../../core/api/types';
import { formatBogotaDateTime } from '../../../../core/utils/date-format';

@Component({
  selector: 'app-case-timeline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <section class="bg-surface-container-lowest rounded-xl p-5 shadow-sm">
      <h2 class="font-headline-sm text-headline-sm text-on-surface m-0 mb-4">Línea de tiempo</h2>
      @if (entries().length === 0) {
        <p class="font-body-default text-on-surface-variant m-0">Sin providencias en este caso.</p>
      } @else {
        <div
          class="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-container-high"
        >
          @for (item of entries(); track item.attachment_id) {
            <a
              class="relative block no-underline text-inherit hover:bg-surface-container-low/50 rounded-lg p-2 -ml-2"
              [routerLink]="['/documents', item.attachment_id]"
            >
              <div class="absolute left-[-19px] top-3 w-3 h-3 rounded-full bg-primary"></div>
              <div class="flex flex-wrap items-baseline justify-between gap-2">
                <span class="text-xs font-medium text-on-surface-variant">
                  {{ formatBogotaDateTime(item.notified_at) }}
                </span>
                <span
                  class="px-1.5 py-0.5 rounded bg-surface-container text-[11px] font-medium text-on-surface-variant"
                >
                  {{ responseStatusLabel(item.respuesta_estado, item.a_tiempo) }}
                </span>
              </div>
              <p class="text-body-compact text-on-surface font-medium m-0 mt-1">
                {{ providenciaTitle(item.clase, item.subtipo) }}
              </p>
              <p class="text-caption text-on-surface-variant m-0">{{ item.filename }}</p>
            </a>
          }
        </div>
      }
    </section>
  `,
})
export class CaseTimeline {
  readonly entries = input.required<TimelineEntry[]>();
  readonly formatBogotaDateTime = formatBogotaDateTime;
  readonly providenciaTitle = providenciaTitle;
  readonly responseStatusLabel = responseStatusLabel;
}
