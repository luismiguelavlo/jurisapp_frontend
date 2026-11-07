import { ChangeDetectionStrategy, Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MaterialIcon } from '../material-icon/material-icon';

@Component({
  selector: 'app-password-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PasswordField),
      multi: true,
    },
  ],
  template: `
    <div class="relative flex items-center">
      <input
        [id]="inputId()"
        [type]="visible() ? 'text' : 'password'"
        [attr.autocomplete]="autocomplete()"
        [attr.name]="name()"
        [placeholder]="placeholder()"
        [class]="inputClasses()"
        [value]="value()"
        [disabled]="disabled()"
        (input)="onInput($event)"
        (blur)="onTouched()"
      />
      <button
        type="button"
        class="absolute right-2 text-on-surface-variant hover:text-on-surface focus:outline-none flex items-center justify-center p-1 rounded cursor-pointer"
        [attr.aria-label]="visible() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
        (click)="toggleVisibility()"
      >
        <app-material-icon [name]="visible() ? 'visibility_off' : 'visibility'" [size]="16" />
      </button>
    </div>
  `,
})
export class PasswordField implements ControlValueAccessor {
  readonly inputId = input('passwordInput');
  readonly name = input('password');
  readonly autocomplete = input('current-password');
  readonly placeholder = input('••••••••••••');
  readonly variant = input<'login' | 'surface'>('login');

  readonly value = signal('');
  readonly visible = signal(false);
  readonly disabled = signal(false);

  private onChange: (value: string) => void = () => undefined;
  onTouched: () => void = () => undefined;

  inputClasses(): string {
    if (this.variant() === 'surface') {
      return 'w-full h-9 pl-3 pr-9 rounded-[6px] bg-surface-container-lowest text-on-surface text-body-default outline-none transition-all placeholder:text-outline focus:bg-surface-container-low disabled:opacity-50';
    }
    return 'w-full h-9 pl-3 pr-9 text-body-default bg-surface-container-lowest border border-outline-variant rounded-[4px] text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors disabled:opacity-50';
  }

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  onInput(event: Event): void {
    const next = (event.target as HTMLInputElement).value;
    this.value.set(next);
    this.onChange(next);
  }

  toggleVisibility(): void {
    this.visible.update((current) => !current);
  }
}
