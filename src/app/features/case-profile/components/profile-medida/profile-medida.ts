import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { MedidaFicha } from '../../../../core/api/types';

/** Medida provisional: si se pidió, si el despacho la concedió y en qué consiste (§3.4). */
@Component({
  selector: 'app-profile-medida',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let m = medida();
    @if (!editing()) {
      <p class="m-0 text-body-default text-on-surface">
        @if (!m.solicitada) {
          No se solicitó.
        } @else {
          {{ concedidaLabel(m.concedida) }}
        }
      </p>
      @if (m.descripcion) {
        <p class="m-0 text-body-compact text-on-surface-variant">{{ m.descripcion }}</p>
      }
    } @else {
      <div class="flex flex-col gap-2 text-body-compact text-on-surface">
        <label class="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            [checked]="m.solicitada"
            (change)="emit({ solicitada: $any($event.target).checked })"
          />
          Se solicitó
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-caption text-on-surface-variant">Decisión del despacho</span>
          <select
            class="h-8 px-2 rounded-[4px] bg-surface-container-lowest border border-outline-variant text-body-compact text-on-surface"
            [value]="m.concedida === null ? '' : String(m.concedida)"
            (change)="setConcedida($any($event.target).value)"
          >
            <option value="">Sin decidir</option>
            <option value="true">Concedida</option>
            <option value="false">Negada</option>
          </select>
        </label>
        <textarea
          rows="2"
          aria-label="Descripción de la medida"
          class="w-full px-2 py-1.5 rounded-[4px] bg-surface-container-lowest border border-outline-variant text-body-compact text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
          [value]="m.descripcion ?? ''"
          (input)="emit({ descripcion: $any($event.target).value || null })"
        ></textarea>
      </div>
    }
  `,
})
export class ProfileMedida {
  readonly medida = input.required<MedidaFicha>();
  readonly editing = input(false);
  readonly medidaChange = output<MedidaFicha>();

  readonly String = String;

  concedidaLabel(c: boolean | null): string {
    if (c === null) return 'Solicitada; el despacho aún no decide.';
    return c ? 'Solicitada y concedida.' : 'Solicitada y negada.';
  }

  setConcedida(v: string): void {
    this.emit({ concedida: v === '' ? null : v === 'true' });
  }

  emit(p: Partial<MedidaFicha>): void {
    this.medidaChange.emit({ ...this.medida(), ...p });
  }
}
