import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AlertBanner } from '../../../../../shared/components/alert-banner/alert-banner';
import type { LoginCredentials, LoginSimulatorState } from '../../models/login.models';
import { LoginForm } from '../login-form/login-form';

@Component({
  selector: 'app-login-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AlertBanner, LoginForm],
  template: `
    <div
      class="w-full max-w-[360px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[6px] p-6 text-zinc-900 dark:text-zinc-100"
    >
      <div class="mb-5">
        <div class="flex items-center gap-1.5">
          <h1 class="text-headline-md font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            salud-auto
          </h1>
          <span class="w-1.5 h-1.5 rounded-full bg-brand mb-0.5" title="Servicio activo"></span>
        </div>
        <p class="text-body-compact text-zinc-500 dark:text-zinc-400 mt-1">
          Sincronización segura de metadatos de correo
        </p>
      </div>

      @if (state() !== 'normal') {
        <div class="space-y-2 mb-4">
          @if (state() === 'error') {
            <app-alert-banner variant="error">
              Credenciales inválidas. Verifique sus datos.
            </app-alert-banner>
          }
          @if (state() === 'rateLimit') {
            <app-alert-banner variant="warning">
              Demasiados intentos. Intente de nuevo en
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
