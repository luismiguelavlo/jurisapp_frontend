import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';

export type StringListVariant = 'chips' | 'numbered' | 'bullets';

/** Lista de textos de la ficha (derechos, pretensiones, pruebas) en lectura o edición. */
@Component({
  selector: 'app-profile-string-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    @if (!editing()) {
      @if (items().length === 0) {
        <p class="m-0 text-body-compact text-on-surface-variant">Sin elementos.</p>
      } @else if (variant() === 'chips') {
        <div class="flex flex-wrap gap-1.5">
          @for (it of items(); track $index) {
            <span
              class="px-2 py-0.5 rounded-full bg-secondary-container/50 text-on-surface text-body-compact"
              >{{ it }}</span
            >
          }
        </div>
      } @else if (variant() === 'numbered') {
        <ol class="m-0 pl-5 list-decimal marker:text-on-surface-variant flex flex-col gap-1.5 text-body-default text-on-surface max-w-[68ch]">
          @for (it of items(); track $index) {
            <li>{{ it }}</li>
          }
        </ol>
      } @else {
        <ul class="m-0 pl-5 list-disc marker:text-on-surface-variant flex flex-col gap-1 text-body-default text-on-surface">
          @for (it of items(); track $index) {
            <li>{{ it }}</li>
          }
        </ul>
      }
    } @else {
      <div class="flex flex-col gap-1.5">
        @for (it of items(); track $index; let i = $index) {
          <div class="flex items-start gap-1.5">
            <textarea
              rows="1"
              class="flex-1 px-2 py-1.5 rounded-[6px] bg-surface-container-low text-body-compact text-on-surface border-0 focus:outline-none focus:ring-1 focus:ring-primary resize-y"
              [attr.aria-label]="'Elemento ' + (i + 1)"
              [value]="it"
              (input)="update(i, $event)"
            ></textarea>
            <button
              type="button"
              class="p-1.5 rounded text-on-surface-variant hover:bg-surface-container border-0 bg-transparent cursor-pointer"
              aria-label="Quitar"
              (click)="remove(i)"
            >
              <app-material-icon name="close" [size]="16" />
            </button>
          </div>
        }
        <button
          type="button"
          class="self-start flex items-center gap-1 text-caption text-primary border-0 bg-transparent cursor-pointer p-0 hover:underline"
          (click)="add()"
        >
          <app-material-icon name="add" [size]="14" />
          Agregar
        </button>
      </div>
    }
  `,
})
export class ProfileStringList {
  readonly items = input.required<string[]>();
  readonly variant = input<StringListVariant>('bullets');
  readonly editing = input(false);
  readonly itemsChange = output<string[]>();

  update(i: number, e: Event): void {
    const v = (e.target as HTMLTextAreaElement).value;
    this.itemsChange.emit(this.items().map((x, j) => (j === i ? v : x)));
  }

  remove(i: number): void {
    this.itemsChange.emit(this.items().filter((_, j) => j !== i));
  }

  add(): void {
    this.itemsChange.emit([...this.items(), '']);
  }
}
