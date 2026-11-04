import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { ApiError } from '../../core/api/client';
import { documentsApi } from '../../core/api/endpoints';
import { errorText } from '../../core/api/errors';
import type { DocumentItem, ReviewStatus } from '../../core/api/types';
import { MaterialIcon } from '../../shared/components/material-icon/material-icon';
import { DocumentsTable } from './components/documents-table/documents-table';

@Component({
  selector: 'app-documents-inbox-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocumentsTable, MaterialIcon],
  template: `
    <div class="max-w-[1120px] mx-auto px-margin-tablet lg:px-margin-desktop py-space-md flex flex-col gap-space-md">
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-space-sm">
        <div>
          <h1 class="text-headline-lg text-on-surface font-semibold tracking-tight m-0">
            {{ onlyUnclassified() ? 'Sin clasificar' : 'Bandeja de providencias' }}
          </h1>
          <p class="text-body-default text-on-surface-variant mt-space-xs mb-0">
            @if (onlyUnclassified()) {
              Providencias extraídas sin radicado / caso asociado.
            } @else {
              Abra una fila para revisar la extracción y confirmar datos.
            }
          </p>
        </div>
        <div class="flex items-center gap-1 bg-surface-container-low p-0.5 rounded-[6px]">
          @for (f of filters; track f.value) {
            <button
              type="button"
              class="px-2.5 py-1 rounded text-caption font-medium border-0 cursor-pointer transition-all"
              [class]="
                reviewFilter() === f.value
                  ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                  : 'bg-transparent text-on-surface-variant hover:text-on-surface'
              "
              (click)="setFilter(f.value)"
            >
              {{ f.label }}
            </button>
          }
        </div>
      </div>

      @if (loading()) {
        <p class="text-body-default text-on-surface-variant">Cargando providencias…</p>
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
        <div
          class="bg-surface-container-lowest rounded-xl p-space-xl text-center text-on-surface-variant"
        >
          <app-material-icon name="inbox" [size]="32" className="text-outline mb-2" />
          <p class="m-0 text-body-default">
            Aún no hay providencias. Sincronice un buzón en
            <strong class="text-on-surface">Conexiones de correo</strong>.
          </p>
        </div>
      } @else {
        <app-documents-table
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
  readonly items = signal<DocumentItem[]>([]);
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

  async reload(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.nextCursor.set(null);
    try {
      const filter =
        this.reviewFilter() === 'all'
          ? { document_status: 'extracted' as const }
          : {
              document_status: 'extracted' as const,
              review_status: this.reviewFilter() as ReviewStatus,
            };
      const page = await documentsApi.list(
        this.onlyUnclassified() ? { ...filter, review_status: 'unreviewed' } : filter,
      );
      const items = this.onlyUnclassified()
        ? page.items.filter((d) => d.case_id == null)
        : page.items;
      this.items.set(items);
      this.nextCursor.set(this.onlyUnclassified() ? null : page.next_cursor);
    } catch (e) {
      this.error.set(errorText(e instanceof ApiError ? e.code : null));
      this.items.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  async loadMore(): Promise<void> {
    const cursor = this.nextCursor();
    if (!cursor || this.loadingMore() || this.onlyUnclassified()) return;
    this.loadingMore.set(true);
    try {
      const filter =
        this.reviewFilter() === 'all' ? {} : { review_status: this.reviewFilter() as ReviewStatus };
      const page = await documentsApi.list(filter, cursor);
      this.items.update((prev) => [...prev, ...page.items]);
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
