import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { MessageAssignment } from '../../../core/api/types';
import { formatBogotaDateTime, relativeFromNow } from '../../../core/utils/date-format';
import { displayName, initials } from '../../../core/utils/person-name';
import { MaterialIcon } from '../material-icon/material-icon';

/**
 * Revisor asignado a un correo (SPEC 24): iniciales, nombre y hace cuánto se le asignó (fecha exacta en el
 * título). `compact` para filas de tabla; `showName = false` cuando el que mira es el propio asignado.
 */
@Component({
  selector: 'app-assignee-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  host: { class: 'inline-flex min-w-0' },
  template: `
    @if (assignment(); as a) {
      <span class="inline-flex items-center gap-2 min-w-0" [attr.title]="title()">
        @if (showName()) {
          <span
            class="shrink-0 rounded-full inline-flex items-center justify-center font-semibold bg-primary-fixed text-on-primary-fixed-variant"
            [class]="compact() ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-[12px]'"
            aria-hidden="true"
            >{{ ini() }}</span
          >
        }
        <span class="flex flex-col min-w-0">
          @if (showName()) {
            <span class="text-body-compact text-on-surface truncate">{{ name() }}</span>
          }
          <span class="inline-flex items-center gap-1 text-caption text-on-surface-variant whitespace-nowrap">
            @if (a.origen === 'manual') {
              <app-material-icon name="swap_horiz" [size]="13" />
            }
            {{ showName() ? '' : 'Asignado ' }}{{ when() }}
          </span>
        </span>
      </span>
    } @else {
      <span
        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container text-caption text-on-surface-variant whitespace-nowrap"
      >
        <app-material-icon name="person_off" [size]="13" />
        Sin asignar
      </span>
    }
  `,
})
export class AssigneeChip {
  readonly assignment = input<MessageAssignment | null>(null);
  readonly compact = input(true);
  readonly showName = input(true);
  /** Nombre de quien reasignó, ya resuelto (las manuales lo muestran en el título). */
  readonly reassignedBy = input<string | null>(null);

  readonly name = computed(() => {
    const a = this.assignment();
    return a ? displayName(a) : '';
  });
  readonly ini = computed(() => {
    const a = this.assignment();
    return a ? initials(a) : '';
  });
  readonly when = computed(() => {
    const iso = this.assignment()?.asignado_at;
    return iso ? relativeFromNow(iso) || formatBogotaDateTime(iso) : '';
  });
  readonly title = computed(() => {
    const a = this.assignment();
    if (!a) return null;
    const base = `Asignado a ${displayName(a)} el ${formatBogotaDateTime(a.asignado_at)}`;
    if (a.origen === 'automatica') return `${base} (reparto automático)`;
    return this.reassignedBy() ? `${base} · reasignado por ${this.reassignedBy()}` : `${base} (reasignado a mano)`;
  });
}
