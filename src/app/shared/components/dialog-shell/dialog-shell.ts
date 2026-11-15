import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { MaterialIcon } from '../material-icon/material-icon';

let nextId = 0;

/**
 * Hoja modal sobre el papel: título, texto de apoyo, cuerpo y pie de acciones.
 * Cuerpo por `<ng-content />`; acciones con el atributo `dialog-actions`.
 */
@Component({
  selector: 'app-dialog-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  host: { '(document:keydown.escape)': 'dismissible() && closed.emit()' },
  template: `
    <div class="fixed inset-0 z-[110] flex items-end sm:items-center justify-center sm:p-4 bg-on-surface/40">
      <div class="absolute inset-0" (click)="dismissible() && closed.emit()" aria-hidden="true"></div>
      <section
        #panel
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        [attr.aria-labelledby]="titleId"
        [attr.aria-describedby]="description() ? descId : null"
        class="dialog-enter relative w-full bg-surface-container-lowest rounded-t-xl sm:rounded-xl shadow-xl flex flex-col max-h-[92vh] focus:outline-none"
        [class]="width() === 'sm' ? 'sm:max-w-md' : 'sm:max-w-lg'"
      >
        <header class="flex items-start justify-between gap-4 px-6 pt-5 pb-4">
          <div class="flex flex-col gap-1 min-w-0">
            <h2 [id]="titleId" class="m-0 text-headline-md text-on-surface">{{ title() }}</h2>
            @if (description()) {
              <p [id]="descId" class="m-0 text-body-compact text-on-surface-variant max-w-[52ch]">
                {{ description() }}
              </p>
            }
          </div>
          @if (dismissible()) {
            <button
              type="button"
              class="-mr-2 -mt-1 w-8 h-8 shrink-0 inline-flex items-center justify-center rounded-[4px] text-on-surface-variant hover:text-on-surface hover:bg-surface-container border-0 bg-transparent cursor-pointer"
              aria-label="Cerrar"
              (click)="closed.emit()"
            >
              <app-material-icon name="close" [size]="18" />
            </button>
          }
        </header>

        <div class="px-6 pb-5 overflow-y-auto">
          <ng-content />
        </div>

        <footer
          class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-6 py-3.5 border-t border-outline-variant/60 bg-surface-container-low/60 rounded-b-xl"
        >
          <ng-content select="[dialog-actions]" />
        </footer>
      </section>
    </div>
  `,
  styles: `
    .dialog-enter {
      animation: dialog-in 160ms cubic-bezier(0.2, 0.7, 0.2, 1);
    }
    @keyframes dialog-in {
      from {
        opacity: 0;
        transform: translateY(6px);
      }
    }
  `,
})
export class DialogShell implements AfterViewInit {
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
  readonly width = input<'sm' | 'md'>('md');
  /** false mientras hay un secreto en pantalla que no se ha copiado o confirmado. */
  readonly dismissible = input(true);
  readonly closed = output<void>();

  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  readonly titleId = `dialog-title-${++nextId}`;
  readonly descId = `dialog-desc-${nextId}`;

  ngAfterViewInit(): void {
    const first = this.panel().nativeElement.querySelector<HTMLElement>(
      'input:not([disabled]), select, textarea, [data-autofocus]',
    );
    (first ?? this.panel().nativeElement).focus();
  }
}
