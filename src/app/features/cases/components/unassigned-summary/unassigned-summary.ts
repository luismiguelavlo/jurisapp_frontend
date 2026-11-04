import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { relativeFromNow } from '../../../../core/utils/date-format';

@Component({
  selector: 'app-unassigned-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div class="bg-surface-container-lowest rounded-xl p-4 shadow-sm">
        <span class="font-caption text-caption text-on-surface-variant block"
          >Pendientes por radicar</span
        >
        <span class="font-headline-md text-headline-md text-on-surface"
          >{{ total() }} correo{{ total() === 1 ? '' : 's' }}</span
        >
      </div>
      <div class="bg-surface-container-lowest rounded-xl p-4 shadow-sm">
        <span class="font-caption text-caption text-on-surface-variant block"
          >Adjuntos pendientes</span
        >
        <span class="font-headline-md text-headline-md text-on-surface"
          >{{ adjuntos() }} PDF{{ adjuntos() === 1 ? '' : 's' }}</span
        >
      </div>
      <div class="bg-surface-container-lowest rounded-xl p-4 shadow-sm">
        <span class="font-caption text-caption text-on-surface-variant block"
          >Último sync de correo</span
        >
        <span class="font-headline-md text-headline-md text-on-surface">{{
          lastSyncLabel()
        }}</span>
      </div>
    </div>
  `,
})
export class UnassignedSummary {
  readonly total = input(0);
  readonly adjuntos = input(0);
  readonly lastSyncAt = input<string | null>(null);

  lastSyncLabel(): string {
    const iso = this.lastSyncAt();
    if (!iso) return '—';
    return relativeFromNow(iso) || '—';
  }
}
