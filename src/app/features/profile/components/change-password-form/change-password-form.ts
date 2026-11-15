import { ChangeDetectionStrategy, Component, input, output, signal, viewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { AlertBanner } from '../../../../shared/components/alert-banner/alert-banner';
import { NewPasswordFields } from '../../../../shared/components/new-password-fields/new-password-fields';
import { PasswordField } from '../../../../shared/components/password-field/password-field';
import { BTN } from '../../../../shared/ui/ui-classes';

export type ChangePasswordError = 'invalid_credentials' | 'weak_password' | 'password_reused' | 'rate_limited' | null;

@Component({
  selector: 'app-change-password-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, PasswordField, NewPasswordFields, AlertBanner],
  template: `
    <form class="flex flex-col gap-4" (ngSubmit)="submit()">
      @switch (error()) {
        @case ('invalid_credentials') {
          <app-alert-banner variant="error">La contraseña actual no es correcta.</app-alert-banner>
        }
        @case ('password_reused') {
          <app-alert-banner variant="error">Ya usaste esa contraseña antes. Elige una diferente.</app-alert-banner>
        }
        @case ('weak_password') {
          <app-alert-banner variant="error">Esa contraseña es muy débil. Usa entre 12 y 128 caracteres, con al menos 4 distintos, y que no sea tu correo.</app-alert-banner>
        }
        @case ('rate_limited') {
          <app-alert-banner variant="warning">Demasiados intentos. Espera un minuto antes de volver a probar.</app-alert-banner>
        }
      }

      <input type="email" class="sr-only" autocomplete="username" [value]="email()" tabindex="-1" aria-hidden="true" readonly />
      <div>
        <label class="block text-label-compact text-on-surface mb-1" for="cp-current">Contraseña actual</label>
        <app-password-field inputId="cp-current" autocomplete="current-password" placeholder="" [formControl]="current" />
      </div>

      <app-new-password-fields idPrefix="cp" [email]="email()" (valueChange)="next.set($event)" />

      <p class="m-0 text-caption text-on-surface-variant">
        Al cambiarla se cierran tus sesiones en los demás dispositivos. Aquí sigues dentro.
      </p>

      <div class="flex justify-end">
        <button type="submit" [class]="btn.primary" [disabled]="!next() || !currentValue() || busy()">
          {{ busy() ? 'Cambiando…' : 'Cambiar contraseña' }}
        </button>
      </div>
    </form>
  `,
})
export class ChangePasswordForm {
  readonly email = input('');
  readonly error = input<ChangePasswordError>(null);
  readonly busy = input(false);
  readonly submitted = output<{ current_password: string; new_password: string }>();

  readonly btn = BTN;
  readonly current = new FormControl('', { nonNullable: true });
  readonly currentValue = signal('');
  readonly next = signal<string | null>(null);
  private readonly fields = viewChild.required(NewPasswordFields);

  constructor() {
    this.current.valueChanges.subscribe((v) => this.currentValue.set(v));
  }

  reset(): void {
    this.current.setValue('');
    this.fields().reset();
  }

  submit(): void {
    const next = this.next();
    if (!next || !this.currentValue()) return;
    this.submitted.emit({ current_password: this.currentValue(), new_password: next });
  }
}
