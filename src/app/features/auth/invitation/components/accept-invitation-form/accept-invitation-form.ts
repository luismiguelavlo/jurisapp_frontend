import { ChangeDetectionStrategy, Component, OnInit, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { AlertBanner } from '../../../../../shared/components/alert-banner/alert-banner';
import { NewPasswordFields } from '../../../../../shared/components/new-password-fields/new-password-fields';
import { PasswordField } from '../../../../../shared/components/password-field/password-field';
import { BTN, INPUT_CLASS } from '../../../../../shared/ui/ui-classes';
import type { InvitationPreview } from '../../../../users/models/users.models';

export interface AcceptPayload {
  password: string;
  first_name?: string;
  last_name?: string;
}

export type AcceptError = 'weak_password' | 'invalid_name' | 'invalid_credentials' | 'rate_limited' | null;

/** account_exists=false: nombre + contraseña nueva. account_exists=true: solo la contraseña actual. */
@Component({
  selector: 'app-accept-invitation-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, NewPasswordFields, PasswordField, AlertBanner],
  template: `
    <form class="flex flex-col gap-4" (submit)="$event.preventDefault(); submit()">
      @switch (error()) {
        @case ('weak_password') {
          <app-alert-banner variant="error">Esa contraseña es muy débil. Usa entre {{ preview().password_min_length }} y 128 caracteres, con al menos 4 distintos, y que no sea tu correo.</app-alert-banner>
        }
        @case ('invalid_name') {
          <app-alert-banner variant="error">Revisa tu nombre y apellido: tienen caracteres no permitidos o son demasiado largos.</app-alert-banner>
        }
        @case ('invalid_credentials') {
          <app-alert-banner variant="error">La contraseña no es correcta. Es la misma con la que entras a tu otra organización.</app-alert-banner>
        }
        @case ('rate_limited') {
          <app-alert-banner variant="warning">Demasiados intentos. Espera un minuto antes de volver a probar.</app-alert-banner>
        }
      }

      @if (preview().account_exists) {
        <p class="m-0 text-body-compact text-on-surface-variant">
          Ya tienes una cuenta de JurisApp con <span class="text-on-surface">{{ preview().email }}</span>. Confirma
          con tu contraseña actual y la nueva organización quedará en tu cuenta.
        </p>
        <div>
          <label class="block text-label-compact text-on-surface mb-1" for="acc-current">Tu contraseña actual</label>
          <app-password-field inputId="acc-current" autocomplete="current-password" placeholder="" [formControl]="current" />
        </div>
      } @else {
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-label-compact text-on-surface mb-1" for="acc-first">Nombre</label>
            <input id="acc-first" type="text" maxlength="100" autocomplete="given-name" [formControl]="first" [class]="inputClass" />
          </div>
          <div>
            <label class="block text-label-compact text-on-surface mb-1" for="acc-last">Apellido</label>
            <input id="acc-last" type="text" maxlength="100" autocomplete="family-name" [formControl]="last" [class]="inputClass" />
          </div>
        </div>
        <input type="email" class="sr-only" autocomplete="username" [value]="preview().email" tabindex="-1" aria-hidden="true" readonly />
        <app-new-password-fields
          idPrefix="acc"
          label="Crea tu contraseña"
          [email]="preview().email"
          [minLength]="preview().password_min_length"
          (valueChange)="newPassword.set($event)"
        />
      }

      <button type="submit" [class]="btn.primary + ' w-full h-10 mt-1'" [disabled]="!canSubmit() || busy()">
        {{ busy() ? 'Entrando…' : preview().account_exists ? 'Unirme a ' + preview().tenant_name : 'Crear contraseña y entrar' }}
      </button>
    </form>
  `,
})
export class AcceptInvitationForm implements OnInit {
  readonly preview = input.required<InvitationPreview>();
  readonly error = input<AcceptError>(null);
  readonly busy = input(false);
  readonly submitted = output<AcceptPayload>();

  readonly btn = BTN;
  readonly inputClass = INPUT_CLASS;
  readonly first = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  readonly last = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  readonly current = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  readonly newPassword = signal<string | null>(null);
  private readonly currentValue = signal('');

  ngOnInit(): void {
    this.first.setValue(this.preview().first_name);
    this.last.setValue(this.preview().last_name);
    this.current.valueChanges.subscribe((v) => this.currentValue.set(v));
  }

  canSubmit(): boolean {
    if (this.preview().account_exists) return this.currentValue().length > 0;
    return !!this.newPassword() && this.first.valid && this.last.valid;
  }

  submit(): void {
    if (!this.canSubmit()) return;
    if (this.preview().account_exists) {
      this.submitted.emit({ password: this.current.value });
      return;
    }
    const p = this.preview();
    const first = this.first.value.trim();
    const last = this.last.value.trim();
    this.submitted.emit({
      password: this.newPassword()!,
      ...(first !== p.first_name ? { first_name: first } : {}),
      ...(last !== p.last_name ? { last_name: last } : {}),
    });
  }
}
