import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';
import {
  FICHA_LINK_BTN,
  FICHA_REMOVE_BTN,
  FICHA_TEXTAREA,
  inputValue,
  removeAt,
  replaceAt,
} from '../../ficha-ui';

/**
 * Lista editable de textos (hechos, pretensiones, derechos, pruebas): una entrada numerada por
 * línea, legible como lista, con agregar y quitar.
 */
@Component({
  selector: 'app-editable-string-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    @if (items().length === 0) {
      <p class="m-0 mb-2 text-body-compact text-on-surface-variant">{{ emptyText() }}</p>
    }
    <ol class="m-0 p-0 list-none flex flex-col gap-2">
      @for (item of items(); track $index; let i = $index) {
        <li class="flex items-start gap-2">
          <span
            class="mt-2 w-6 h-6 shrink-0 rounded-full bg-primary/10 text-primary text-[12px] font-semibold flex items-center justify-center"
            >{{ i + 1 }}</span
          >
          <textarea
            [class]="textarea"
            [rows]="rows()"
            [value]="item"
            [attr.aria-label]="itemLabel() + ' ' + (i + 1)"
            (change)="itemsChange.emit(replace(i, $event))"
          ></textarea>
          <button type="button" [class]="removeBtn" title="Quitar" (click)="itemsChange.emit(remove(i))">
            <app-material-icon name="close" [size]="16" />
          </button>
        </li>
      }
    </ol>
    <button type="button" class="mt-2" [class]="linkBtn" (click)="itemsChange.emit(items().concat(''))">
      <app-material-icon name="add" [size]="16" />
      {{ addLabel() }}
    </button>
  `,
})
export class EditableStringList {
  readonly items = input.required<string[]>();
  readonly addLabel = input('Agregar');
  readonly itemLabel = input('Elemento');
  readonly emptyText = input('Sin elementos.');
  readonly rows = input(2);
  readonly itemsChange = output<string[]>();

  readonly textarea = FICHA_TEXTAREA + ' !min-h-0';
  readonly removeBtn = FICHA_REMOVE_BTN;
  readonly linkBtn = FICHA_LINK_BTN;

  replace(i: number, e: Event): string[] {
    return replaceAt(this.items(), i, inputValue(e));
  }

  remove(i: number): string[] {
    return removeAt(this.items(), i);
  }
}
