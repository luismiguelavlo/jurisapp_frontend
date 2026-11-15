import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { TenantUser } from '../../../../core/api/types';
import { displayName } from '../../../../core/utils/person-name';

/** `all` | `mine` | `none` (sin asignar) | un user_id. */
export type AssigneeFilterValue = string;

/** Filtro de la bandeja por revisor asignado (SPEC 24). No se muestra al auxiliar. */
@Component({
  selector: 'app-assignee-filter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex items-center gap-2' },
  template: `
    <label class="text-label-compact text-on-surface-variant whitespace-nowrap" for="assignee-filter">Asignado a</label>
    <select
      id="assignee-filter"
      class="h-8 pl-2 pr-7 rounded-[4px] bg-surface-container-lowest border border-outline-variant text-body-compact text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary max-w-[220px]"
      [value]="value()"
      (change)="valueChange.emit($any($event.target).value)"
    >
      <option value="all">Todos</option>
      <option value="mine">Mis correos</option>
      <option value="none">Sin asignar</option>
      @if (users().length) {
        <optgroup label="Revisor">
          @for (u of users(); track u.id) {
            <option [value]="u.id" [selected]="value() === u.id">{{ name(u) }}</option>
          }
        </optgroup>
      }
    </select>
  `,
})
export class AssigneeFilter {
  readonly value = input.required<AssigneeFilterValue>();
  readonly users = input<ReadonlyArray<TenantUser>>([]);
  readonly valueChange = output<AssigneeFilterValue>();

  readonly name = displayName;
}
