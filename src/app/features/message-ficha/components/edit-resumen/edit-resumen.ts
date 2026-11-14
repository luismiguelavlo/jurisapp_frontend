import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';
import { FICHA_TEXTAREA, type FichaPatch, inputValue, orNull } from '../../ficha-ui';

/** Edición del resumen con IA, con la misma tarjeta que la vista de lectura. */
@Component({
  selector: 'app-edit-resumen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  host: { class: 'block min-w-0' },
  template: `
    <section class="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
      <h2 class="m-0 flex items-center gap-3 px-5 sm:px-6 py-3.5">
        <app-material-icon name="auto_awesome" [size]="18" className="text-primary" class="shrink-0" />
        <label for="e-resumen" class="flex-1 min-w-0 text-headline-sm text-on-surface">Resumen con IA</label>
      </h2>
      <div class="px-5 sm:px-6 pb-5 pt-1">
        <textarea
          id="e-resumen"
          rows="6"
          [class]="textarea"
          [value]="text() ?? ''"
          (change)="patched.emit({ hechos_resumen: orNull(value($event)) })"
        ></textarea>
      </div>
    </section>
  `,
})
export class EditResumen {
  readonly text = input<string | null>(null);
  readonly patched = output<FichaPatch>();

  readonly textarea = FICHA_TEXTAREA;
  readonly orNull = orNull;
  readonly value = inputValue;
}
