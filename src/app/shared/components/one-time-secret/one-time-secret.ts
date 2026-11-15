import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { MaterialIcon } from '../material-icon/material-icon';

/**
 * Talón de un solo uso: una contraseña temporal o un enlace de invitación que el sistema
 * no vuelve a mostrar. La contraseña se parte en bloques de 4 para poder dictarla,
 * igual que un radicado se lee por grupos.
 */
@Component({
  selector: 'app-one-time-secret',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    <div class="slip relative rounded-[6px] bg-surface-container-low">
      <div class="px-5 pt-4 pb-4 flex flex-col gap-3">
        <div class="flex items-baseline justify-between gap-3">
          <span class="text-label-compact text-on-surface">{{ label() }}</span>
          @if (expiresLabel()) {
            <span class="text-caption text-tertiary">{{ expiresLabel() }}</span>
          }
        </div>

        @if (kind() === 'password') {
          <p
            class="m-0 flex flex-wrap gap-x-3 gap-y-1 text-[26px] leading-9 font-semibold text-on-surface tabular-nums tracking-[0.06em] select-all"
            [attr.aria-label]="'Contraseña temporal: ' + spelled()"
          >
            @for (g of groups(); track $index) {
              <span>{{ g }}</span>
            }
          </p>
        } @else {
          <p class="m-0 text-body-default text-on-surface break-all select-all leading-6">{{ value() }}</p>
        }
      </div>

      <div class="stub flex items-center justify-between gap-3 px-5 py-2.5">
        <span class="text-caption text-on-surface-variant">{{ footnote() }}</span>
        <button
          type="button"
          data-autofocus
          class="h-8 px-3 shrink-0 rounded-[4px] text-label-compact inline-flex items-center gap-1.5 border-0 cursor-pointer transition-colors"
          [class]="copied() ? 'bg-[#e3efe7] text-[#2f7049]' : 'bg-primary text-on-primary hover:bg-brand-hover'"
          (click)="copy()"
        >
          <app-material-icon [name]="copied() ? 'check' : 'content_copy'" [size]="15" />
          {{ copied() ? 'Copiado' : copyLabel() }}
        </button>
      </div>
      <span class="sr-only" aria-live="polite">{{ copied() ? 'Copiado al portapapeles' : '' }}</span>
    </div>
  `,
  styles: `
    .slip {
      box-shadow: inset 0 0 0 1px var(--color-outline-variant);
    }
    /* Línea de corte del talón: muescas laterales y trazo perforado. */
    .stub {
      position: relative;
      background-image: linear-gradient(to right, var(--color-outline) 50%, transparent 0);
      background-size: 8px 1px;
      background-repeat: repeat-x;
      background-position: top;
    }
    .stub::before,
    .stub::after {
      content: '';
      position: absolute;
      top: -7px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--color-surface-container-lowest);
      box-shadow: inset 0 0 0 1px var(--color-outline-variant);
    }
    .stub::before {
      left: -7px;
      clip-path: inset(0 0 0 50%);
    }
    .stub::after {
      right: -7px;
      clip-path: inset(0 50% 0 0);
    }
  `,
})
export class OneTimeSecret {
  readonly value = input.required<string>();
  readonly kind = input<'password' | 'link'>('password');
  readonly label = input('Contraseña temporal');
  readonly expiresLabel = input<string | null>(null);
  readonly footnote = input('No se volverá a mostrar.');
  readonly copyLabel = input('Copiar');
  readonly copiedChange = output<void>();

  readonly copied = signal(false);

  readonly groups = computed(() => this.value().match(/.{1,4}/g) ?? []);
  readonly spelled = computed(() => this.value().split('').join(' '));

  async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.value());
    } catch {
      /* sin permiso de portapapeles: el texto sigue seleccionable */
    }
    this.copied.set(true);
    this.copiedChange.emit();
    setTimeout(() => this.copied.set(false), 2400);
  }
}
