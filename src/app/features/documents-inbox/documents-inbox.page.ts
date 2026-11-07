import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiError } from '../../core/api/client';
import { inboxApi } from '../../core/api/endpoints';
import { errorText } from '../../core/api/errors';
import type { DocumentFilters, InboxMessage, ReviewStatus } from '../../core/api/types';
import { MaterialIcon } from '../../shared/components/material-icon/material-icon';
import { SegmentedFilter } from '../../shared/components/segmented-filter/segmented-filter';
import { InboxMessagesTable } from '../../shared/components/inbox-messages-table/inbox-messages-table';

@Component({
  selector: 'app-documents-inbox-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InboxMessagesTable, MaterialIcon, RouterLink, SegmentedFilter],
  template: `
    <div class="w-full max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-5">
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div class="flex flex-col gap-1">
          <h1 class="m-0 text-headline-lg text-on-surface">
            {{ onlyUnclassified() ? 'Sin clasificar' : 'Bandeja de correos electrónicos' }}
          </h1>
          <p class="m-0 text-body-default text-on-surface-variant">
            @if (onlyUnclassified()) {
              Correos con providencias que todavía no tienen un proceso asociado.
            } @else {
              Lo que llegó de los juzgados, un correo por fila. Ábrelo para confirmar los datos de cada providencia.
            }
          </p>
        </div>
        <app-segmented-filter
          label="Estado de revisión"
          [options]="filters"
          [value]="reviewFilter()"
          (valueChange)="setFilter($event)"
        />
      </div>

      @if (loading()) {
        <p class="text-body-default text-on-surface-variant">Cargando correos…</p>
      } @else if (error()) {
        <div class="p-space-md rounded-lg bg-[#FEF2F2] text-[#991B1B] flex items-center gap-2">
          <app-material-icon name="error" [size]="18" />
          <span>{{ error() }}</span>
          <button
            type="button"
            class="underline border-0 bg-transparent cursor-pointer text-inherit ml-2"
            (click)="reload()"
          >
            Reintentar
          </button>
        </div>
      } @else if (items().length === 0) {
        <div class="bg-surface-container-lowest rounded-xl shadow-sm px-6 py-10 flex flex-col items-start gap-3">
          @if (reviewFilter() === 'all' && !onlyUnclassified()) {
            <p class="m-0 text-headline-sm text-on-surface">Aún no han llegado providencias</p>
            <p class="m-0 text-body-default text-on-surface-variant max-w-[36rem]">
              Conecta el buzón donde los juzgados notifican a tu entidad y aquí aparecerá cada auto
              y fallo con su término.
            </p>
            <a
              routerLink="/conexiones"
              class="mt-1 inline-flex items-center gap-1.5 h-9 px-4 rounded-[4px] bg-primary text-on-primary text-label-default no-underline hover:bg-brand-hover"
            >
              <app-material-icon name="alternate_email" [size]="16" />
              Conectar un buzón
            </a>
          } @else {
            <p class="m-0 text-headline-sm text-on-surface">No hay correos en esta vista</p>
            <p class="m-0 text-body-default text-on-surface-variant">
              Prueba con otro filtro de revisión.
            </p>
          }
        </div>
      } @else {
        <app-inbox-messages-table
          [items]="items()"
          [nextCursor]="nextCursor()"
          [loadingMore]="loadingMore()"
          (loadMore)="loadMore()"
        />
      }
    </div>
  `,
})
export class DocumentsInboxPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly filters: ReadonlyArray<{ value: ReviewStatus | 'all'; label: string }> = [
    { value: 'all', label: 'Todas' },
    { value: 'unreviewed', label: 'Sin revisar' },
    { value: 'confirmed', label: 'Confirmadas' },
    { value: 'corrected', label: 'Corregidas' },
  ];

  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly error = signal<string | null>(null);
  readonly items = signal<InboxMessage[]>([]);
  readonly nextCursor = signal<string | null>(null);
  readonly reviewFilter = signal<ReviewStatus | 'all'>('all');
  readonly onlyUnclassified = signal(false);

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((q) => {
      this.onlyUnclassified.set(q.get('sin_caso') === '1');
      void this.reload();
    });
  }

  setFilter(value: ReviewStatus | 'all'): void {
    this.reviewFilter.set(value);
    void this.reload();
  }

  private queryFilters(): DocumentFilters {
    const review = this.onlyUnclassified() ? 'unreviewed' : this.reviewFilter();
    return review === 'all'
      ? { document_status: 'extracted' }
      : { document_status: 'extracted', review_status: review };
  }

  /** "Sin clasificar": correos cuyo caso aún no existe. */
  private visible(items: InboxMessage[]): InboxMessage[] {
    return this.onlyUnclassified() ? items.filter((m) => m.caso.case_id == null) : items;
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.nextCursor.set(null);
    try {
      const page = await inboxApi.list(this.queryFilters());
      this.items.set(this.visible(page.items));
      this.nextCursor.set(page.next_cursor);
    } catch (e) {
      this.error.set(errorText(e instanceof ApiError ? e.code : null));
      this.items.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  async loadMore(): Promise<void> {
    const cursor = this.nextCursor();
    if (!cursor || this.loadingMore()) return;
    this.loadingMore.set(true);
    try {
      const page = await inboxApi.list(this.queryFilters(), cursor);
      this.items.update((prev) => [...prev, ...this.visible(page.items)]);
      this.nextCursor.set(page.next_cursor);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'invalid_cursor') {
        await this.reload();
      }
    } finally {
      this.loadingMore.set(false);
    }
  }
}
