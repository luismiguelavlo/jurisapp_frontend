import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AlertBanner } from '../../../../../shared/components/alert-banner/alert-banner';
import type { LoginCredentials, LoginSimulatorState } from '../../models/login.models';
import { AppLogo } from '../../../../../shared/components/app-logo/app-logo';
import { LoginForm } from '../login-form/login-form';

@Component({
  selector: 'app-login-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AlertBanner, LoginForm],
  template: `
    <div class="w-full bg-surface-container-lowest rounded-xl p-6 sm:p-7 text-on-surface shadow-sm">
      <div class="mb-5">
        <h2 class="m-0 text-headline-md text-on-surface">Iniciar sesión</h2>
        <p class="m-0 mt-1 text-body-compact text-on-surface-variant">
          Entra con la cuenta que te dio el administrador de tu entidad.
        </p>
      </div>

      @if (state() !== 'normal') {
        <div class="space-y-2 mb-4">
          @if (state() === 'error') {
            <app-alert-banner variant="error">
              La organización, el correo o la contraseña no coinciden. Revísalos e inténtalo de nuevo.
            </app-alert-banner>
          }
          @if (state() === 'rateLimit') {
            <app-alert-banner variant="warning">
              Demasiados intentos. Podrás intentarlo de nuevo en
              <span class="font-medium">{{ countdown() }}</span
              >s.
            </app-alert-banner>
          }
        </div>
      }

      <app-login-form
        [submitDisabled]="state() === 'rateLimit' || loading()"
        (submitted)="submitted.emit($event)"
      />
    </div>
  `,
})
export class LoginCard {
  readonly state = input.required<LoginSimulatorState>();
  readonly countdown = input(0);
  readonly loading = input(false);
  readonly submitted = output<LoginCredentials>();
}
