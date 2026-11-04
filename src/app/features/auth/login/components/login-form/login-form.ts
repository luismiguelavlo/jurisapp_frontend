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
          class="block text-label-compact font-medium text-zinc-700 dark:text-zinc-300 mb-1"
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
          class="w-full h-9 px-3 text-body-default bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[6px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
        />
        <p class="text-caption text-zinc-400 dark:text-zinc-500 mt-1">
          Identificador único de su organización
        </p>
      </div>

      <div>
        <label
          class="block text-label-compact font-medium text-zinc-700 dark:text-zinc-300 mb-1"
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
          class="w-full h-9 px-3 text-body-default bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[6px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
        />
      </div>

      <div>
        <div class="flex items-center justify-between mb-1">
          <label
            class="text-label-compact font-medium text-zinc-700 dark:text-zinc-300"
            for="passwordInput"
          >
            Contraseña
          </label>
          <a
            class="text-caption text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
            href="#"
          >
            Olvidé mi contraseña
          </a>
        </div>
        <app-password-field formControlName="password" />
      </div>

      <div class="pt-1">
        <button
          type="submit"
          class="w-full h-9 rounded-[6px] bg-brand hover:bg-brand-hover active:bg-brand-active text-white text-label-default font-medium transition-colors flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 dark:focus:ring-offset-zinc-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
