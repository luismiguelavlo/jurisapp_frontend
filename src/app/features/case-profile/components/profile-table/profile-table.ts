import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { formatCalendarDate } from '../../../../core/utils/date-format';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';

export interface ProfileColumn<T> {
  key: keyof T & string;
  label: string;
  kind?: 'text' | 'date' | 'select';
  options?: ReadonlyArray<{ value: string; label: string }>;
  /** Vacío se guarda como `null` (si no, cadena vacía). */
  nullable?: boolean;
}

/**
 * Tabla genérica de la ficha (diagnósticos, tecnologías, reclamos, partes…)
 * en lectura o edición en sitio.
 */
@Component({
  selector: 'app-profile-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    @if (!editing() && rows().length === 0) {
      <p class="m-0 text-body-compact text-on-surface-variant">Sin elementos.</p>
    } @else {
      <div class="overflow-x-auto -mx-1">
        <table class="w-full border-collapse text-body-compact">
          <thead>
            <tr class="text-left text-caption text-on-surface-variant">
              @for (c of columns(); track c.key) {
                <th class="font-medium px-1 py-1.5 border-b border-outline-variant/30">{{ c.label }}</th>
              }
              @if (editing()) {
                <th class="w-8 border-b border-outline-variant/30"></th>
              }
            </tr>
          </thead>
          <tbody>
            @for (row of rows(); track $index; let i = $index) {
              <tr class="align-top">
                @for (c of columns(); track c.key) {
                  <td class="px-1 py-1.5 border-b border-outline-variant/15 text-on-surface">
                    @if (!editing()) {
                      {{ display(row, c) }}
                    } @else if (c.kind === 'select') {
                      <select
                        class="w-full min-w-[110px] h-8 px-2 rounded-[6px] bg-surface-container-low text-body-compact text-on-surface border-0"
                        [attr.aria-label]="c.label"
                        [value]="raw(row, c)"
                        (change)="set(i, c, $event)"
                      >
                        @if (c.nullable) {
                          <option value="">—</option>
                        }
                        @for (o of c.options ?? []; track o.value) {
                          <option [value]="o.value">{{ o.label }}</option>
                        }
                      </select>
                    } @else {
                      <input
                        class="w-full min-w-[110px] h-8 px-2 rounded-[6px] bg-surface-container-low text-body-compact text-on-surface border-0 focus:outline-none focus:ring-1 focus:ring-primary"
                        [type]="c.kind === 'date' ? 'date' : 'text'"
                        [attr.aria-label]="c.label"
                        [value]="raw(row, c)"
                        (input)="set(i, c, $event)"
                      />
                    }
                  </td>
                }
                @if (editing()) {
                  <td class="py-1.5 border-b border-outline-variant/15">
                    <button
                      type="button"
                      class="p-1 rounded text-on-surface-variant hover:bg-surface-container border-0 bg-transparent cursor-pointer"
                      aria-label="Quitar fila"
                      (click)="remove(i)"
                    >
                      <app-material-icon name="close" [size]="16" />
                    </button>
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
      @if (editing()) {
        <button
          type="button"
          class="self-start flex items-center gap-1 text-caption text-primary border-0 bg-transparent cursor-pointer p-0 hover:underline"
          (click)="add()"
        >
          <app-material-icon name="add" [size]="14" />
          Agregar fila
        </button>
      }
    }
  `,
})
export class ProfileTable<T extends object> {
  readonly rows = input.required<T[]>();
  readonly columns = input.required<ReadonlyArray<ProfileColumn<T>>>();
  readonly newRow = input.required<() => T>();
  readonly editing = input(false);
  readonly rowsChange = output<T[]>();

  raw(row: T, c: ProfileColumn<T>): string {
    const v = row[c.key];
    return v === null || v === undefined ? '' : String(v);
  }

  display(row: T, c: ProfileColumn<T>): string {
    const v = this.raw(row, c);
    if (!v) return '—';
    if (c.kind === 'date') return formatCalendarDate(v);
    if (c.options) return c.options.find((o) => o.value === v)?.label ?? v;
    return v;
  }

  set(i: number, c: ProfileColumn<T>, e: Event): void {
    const v = (e.target as HTMLInputElement | HTMLSelectElement).value;
    const value = v === '' && c.nullable ? null : v;
    this.rowsChange.emit(
      this.rows().map((r, j) => (j === i ? ({ ...r, [c.key]: value } as T) : r)),
    );
  }

  remove(i: number): void {
    this.rowsChange.emit(this.rows().filter((_, j) => j !== i));
  }

  add(): void {
    this.rowsChange.emit([...this.rows(), this.newRow()()]);
  }
}
