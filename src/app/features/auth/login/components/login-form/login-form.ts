import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import type { LoginCredentials } from '../../models/login.models';
import { PasswordField } from '../../../../../shared/components/password-field/password-field';

@Component({
  selector: 'app-login-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, PasswordField],
  template: `
    <form class="space-y-3.5" [formGroup]="form" (ngSubmit)="onSubmit()">
      <div>
        <label
          class="block text-label-compact font-medium text-on-surface mb-1"
          for="tenantInput"
        >
          Organización
        </label>
        <input
          id="tenantInput"
          type="text"
          formControlName="tenant"
          autocomplete="organization"
          placeholder="clinica-san-rafael"
          class="w-full h-9 px-3 text-body-default bg-surface-container-lowest border border-outline-variant rounded-[4px] text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
        />
        <p class="text-caption text-on-surface-variant mt-1">
          El identificador de tu entidad en JurisApp
        </p>
      </div>

      <div>
        <label
          class="block text-label-compact font-medium text-on-surface mb-1"
          for="emailInput"
        >
          Correo corporativo
        </label>
        <input
          id="emailInput"
          type="email"
          formControlName="email"
          autocomplete="username"
          placeholder="usuario@organizacion.com"
          class="w-full h-9 px-3 text-body-default bg-surface-container-lowest border border-outline-variant rounded-[4px] text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
        />
      </div>

      <div>
        <label class="block text-label-compact font-medium text-on-surface mb-1" for="passwordInput">
          Contraseña
        </label>
        <app-password-field formControlName="password" />
      </div>

      <div class="pt-1">
        <button
          type="submit"
          class="w-full h-10 rounded-[4px] bg-brand hover:bg-brand-hover active:bg-brand-active text-on-primary text-label-default font-medium transition-colors flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-background cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          [disabled]="submitDisabled() || form.invalid"
        >
          <span>Iniciar sesión</span>
        </button>
      </div>
    </form>
  `,
})
export class LoginForm {
  readonly submitDisabled = input(false);
  readonly submitted = output<LoginCredentials>();

  readonly form = new FormGroup({
    tenant: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  onSubmit(): void {
    if (this.form.invalid || this.submitDisabled()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitted.emit(this.form.getRawValue());
  }
}
