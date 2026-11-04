import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ApiError } from '../../core/api/client';
import { casesApi } from '../../core/api/endpoints';
import { errorText } from '../../core/api/errors';
import type { CaseStatus, CaseSummary } from '../../core/api/types';
import { UnassignedService } from '../../core/services/unassigned.service';
import { CasesTable } from './components/cases-table/cases-table';
import { ProcessesEmptyState } from './components/processes-empty-state/processes-empty-state';
import { ProcessesFilters } from './components/processes-filters/processes-filters';
import { ProcessesHeader } from './components/processes-header/processes-header';
import { ProcessesSummary } from './components/processes-summary/processes-summary';

@Component({
  selector: 'app-cases-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ProcessesHeader,
    ProcessesFilters,
    CasesTable,
    ProcessesEmptyState,
    ProcessesSummary,
  ],
  template: `
    <div
      class="w-full max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6"
    >
      <app-processes-header [unclassifiedCount]="unassigned.total()" />

      <app-processes-filters
        [radicadoDigits]="radicadoDigits()"
        [estado]="estadoFilter()"
        (radicadoChange)="onRadicadoChange($event)"
        (clearRadicado)="onClearRadicado()"
        (estadoChange)="onEstadoChange($event)"
      />

      @if (loading()) {
        <p class="text-body-default text-on-surface-variant m-0">Cargando procesos…</p>
      } @else if (error()) {
        <div class="p-4 rounded-xl bg-[#FEF2F2] text-[#991B1B]">
          {{ error() }}
          <button
            type="button"
            class="underline border-0 bg-transparent cursor-pointer text-inherit ml-2"
            (click)="reload()"
          >
            Reintentar
          </button>
        </div>
      } @else if (showEmptyInitial()) {
        <app-processes-empty-state kind="empty" />
      } @else if (items().length === 0) {
        <app-processes-empty-state kind="no-results" (resetFilters)="resetFilters()" />
      } @else {
        <app-cases-table
          [items]="items()"
          [nextCursor]="nextCursor()"
          [loadingMore]="loadingMore()"
          (loadMore)="loadMore()"
        />
      }

      <app-processes-summary
        [atRiskCount]="atRiskCount()"
        [unclassifiedCount]="unassigned.total()"
      />
    </div>
  `,
})
export class CasesListPage implements OnInit {
  readonly unassigned = inject(UnassignedService);

  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly error = signal<string | null>(null);
  readonly items = signal<CaseSummary[]>([]);
  readonly nextCursor = signal<string | null>(null);
  readonly radicadoDigits = signal('');
  readonly estadoFilter = signal<CaseStatus | 'all'>('all');
  readonly hadAnyWithoutFilters = signal(false);

  private radicadoTimer: ReturnType<typeof setTimeout> | null = null;

  readonly atRiskCount = computed(() =>
    this.items().filter((c) => {
      if (c.estado === 'vencido') return true;
      if (c.estado !== 'por_vencer' || !c.proximo_vencimiento) return false;
      const hours = (new Date(c.proximo_vencimiento).getTime() - Date.now()) / 3_600_000;
      return hours <= 48;
    }).length,
  );

  readonly showEmptyInitial = computed(
    () =>
      !this.loading() &&
      this.items().length === 0 &&
      !this.radicadoDigits() &&
      this.estadoFilter() === 'all' &&
      !this.hadAnyWithoutFilters(),
  );

  ngOnInit(): void {
    void this.reload();
    void this.unassigned.refresh();
  }

  onRadicadoChange(digits: string): void {
    this.radicadoDigits.set(digits);
    if (this.radicadoTimer) clearTimeout(this.radicadoTimer);
    const len = digits.length;
    if (len === 0 || len === 21 || len === 23) {
      this.radicadoTimer = setTimeout(() => void this.reload(), 350);
    }
  }

  onClearRadicado(): void {
    this.radicadoDigits.set('');
    void this.reload();
  }

  onEstadoChange(estado: CaseStatus | 'all'): void {
    this.estadoFilter.set(estado);
    void this.reload();
  }

  resetFilters(): void {
    this.radicadoDigits.set('');
    this.estadoFilter.set('all');
    void this.reload();
  }

  async reload(): Promise<void> {
    const digits = this.radicadoDigits();
    if (digits.length > 0 && digits.length !== 21 && digits.length !== 23) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.nextCursor.set(null);
    try {
      const page = await casesApi.list(this.queryParams());
      this.items.set(page.items);
      this.nextCursor.set(page.next_cursor);
      if (!digits && this.estadoFilter() === 'all' && page.items.length > 0) {
        this.hadAnyWithoutFilters.set(true);
      }
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
      const page = await casesApi.list({ ...this.queryParams(), cursor });
      this.items.update((prev) => [...prev, ...page.items]);
      this.nextCursor.set(page.next_cursor);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'invalid_cursor') await this.reload();
    } finally {
      this.loadingMore.set(false);
    }
  }

  private queryParams(): {
    estado?: CaseStatus;
    radicado?: string;
    limit: number;
  } {
    const params: { estado?: CaseStatus; radicado?: string; limit: number } = { limit: 50 };
    if (this.estadoFilter() !== 'all') params.estado = this.estadoFilter() as CaseStatus;
    const digits = this.radicadoDigits();
    if (digits.length === 21 || digits.length === 23) params.radicado = digits;
    return params;
  }

}
