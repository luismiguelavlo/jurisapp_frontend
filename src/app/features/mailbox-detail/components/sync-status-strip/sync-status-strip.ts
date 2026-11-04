import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { SyncRun } from '../../../../core/api/types';
import { errorText } from '../../../../core/api/errors';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';
import type { SyncPhase } from '../../models/mailbox-detail.models';

@Component({
  selector: 'app-sync-status-strip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    <section
      class="w-full bg-surface-container-lowest rounded-[6px] p-space-md overflow-hidden relative"
    >
      @if (phase() === 'running' || run()?.status === 'queued' || run()?.status === 'running') {
        <div class="absolute top-0 left-0 right-0 h-[2px] bg-surface-container overflow-hidden">
          <div class="h-full bg-primary-container w-1/3 animate-pulse"></div>
        </div>
      }

      <div class="flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
        <div class="flex items-center gap-space-md">
          <div
            class="w-8 h-8 rounded-[6px] bg-secondary-container flex items-center justify-center text-on-secondary-container shrink-0"
          >
            <app-material-icon
              [name]="iconName()"
              [size]="18"
              [className]="isBusy() ? 'animate-spin' : ''"
            />
          </div>
          <div class="flex flex-col">
            <div class="flex items-center gap-space-xs">
              <span class="text-body-medium text-on-surface font-semibold">{{ title() }}</span>
            </div>
            <p class="text-caption text-on-surface-variant mb-0">
              Páginas: {{ run()?.pages_fetched ?? 0 }} · Mensajes vistos:
              {{ run()?.messages_seen ?? 0 }} · Nuevos: {{ run()?.messages_inserted ?? 0 }}
            </p>
            @if (run()?.status === 'failed') {
              <p class="text-caption text-error mb-0">{{ errorText(run()?.error_code) }}</p>
            }
          </div>
        </div>

        @if (run()?.has_more && run()?.status === 'succeeded') {
          <div class="flex items-center gap-space-sm self-end md:self-auto">
            <div class="flex items-center gap-space-xs text-on-surface-variant text-caption">
              <span class="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
              <span>Quedan mensajes por sincronizar</span>
            </div>
            <button
              type="button"
              class="h-7 px-space-xs rounded-[4px] bg-surface-container-low hover:bg-surface-container text-on-surface text-label-compact flex items-center gap-1 cursor-pointer"
              (click)="continueBatch.emit()"
            >
              <span>Continuar</span>
              <app-material-icon name="arrow_forward" [size]="14" />
            </button>
          </div>
        }
      </div>
    </section>
  `,
})
export class SyncStatusStrip {
  readonly phase = input<SyncPhase>('idle');
  readonly run = input<SyncRun | null>(null);
  readonly continueBatch = output<void>();
  readonly errorText = errorText;

  readonly isBusy = computed(() => {
    const status = this.run()?.status;
    return this.phase() === 'running' || status === 'queued' || status === 'running';
  });

  readonly title = computed(() => {
    const status = this.run()?.status;
    if (status === 'queued') {
      return 'En cola';
    }
    if (status === 'running' || this.phase() === 'running') {
      return 'Sincronizando…';
    }
    if (status === 'failed') {
      return 'Fallida';
    }
    return 'Completada';
  });

  readonly iconName = computed(() => (this.isBusy() ? 'sync' : 'cloud_done'));
}
