import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiError } from '../../../core/api/client';
import { errorText } from '../../../core/api/errors';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { AlertBanner } from '../../../shared/components/alert-banner/alert-banner';
import { MaterialIcon } from '../../../shared/components/material-icon/material-icon';
import { NewPasswordFields } from '../../../shared/components/new-password-fields/new-password-fields';
import { BTN } from '../../../shared/ui/ui-classes';
import { AuthCard } from '../components/auth-card/auth-card';

/**
 * Se llega aquí tras entrar con una contraseña temporal (password_change_required)
 * o cuando el interceptor recibe 403 password_change_required. No pide la actual.
 */
@Component({
  selector: 'app-forced-password-change-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AuthCard, NewPasswordFields, AlertBanner, MaterialIcon],
  host: { class: 'flex-1 flex w-full' },
  template: `
    <div class="w-full max-w-[440px] mx-auto px-4 py-12 lg:py-16 flex flex-col gap-4">
      <app-auth-card
        title="Crea tu nueva contraseña"
        description="Entraste con una contraseña temporal. Para seguir, elige una propia: la temporal ya no volverá a funcionar."
      >
        <form class="flex flex-col gap-4" (ngSubmit)="submit()">
          @if (error() === 'password_reused') {
            <app-alert-banner variant="error">Esa es una contraseña que ya usaste. Elige una diferente.</app-alert-banner>
          } @else if (error() === 'weak_password') {
            <app-alert-banner variant="error">Esa contraseña es muy débil. Usa entre 12 y 128 caracteres, con al menos 4 distintos, y que no sea tu correo.</app-alert-banner>
          }

          <p class="m-0 text-body-compact text-on-surface-variant">
            Cuenta: <span class="text-on-surface">{{ email() }}</span>
          </p>
          <input type="email" class="sr-only" autocomplete="username" [value]="email()" tabindex="-1" aria-hidden="true" readonly />

          <app-new-password-fields idPrefix="force" [email]="email()" (valueChange)="password.set($event)" />

          <button type="submit" [class]="btn.primary + ' w-full h-10 mt-1'" [disabled]="!password() || busy()">
            {{ busy() ? 'Guardando…' : 'Guardar y continuar' }}
          </button>
        </form>
      </app-auth-card>

      <p class="m-0 px-1 flex items-start gap-2 text-caption text-on-surface-variant leading-5">
        <app-material-icon name="timer" [size]="15" className="shrink-0 mt-0.5 text-tertiary" />
        <span>
          Si cierras esta pestaña sin guardar, la contraseña temporal deja de servir y tendrás que pedirle otra al
          administrador.
        </span>
      </p>
      <button type="button" [class]="btn.quiet + ' self-center'" (click)="auth.logout()">Salir sin cambiarla</button>
    </div>
  `,
})
export class ForcedPasswordChangePage {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly btn = BTN;
  readonly email = computed(() => this.auth.userEmail());
  readonly password = signal<string | null>(null);
  readonly error = signal<'password_reused' | 'weak_password' | null>(null);
  readonly busy = signal(false);

  async submit(): Promise<void> {
    const pwd = this.password();
    if (!pwd || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      // Token restringido: sin contraseña actual. Devuelve tokens normales y quedan guardados.
      await this.auth.changePassword(pwd);
      this.toast.push({ type: 'success', title: 'Contraseña guardada', description: 'Ya puedes trabajar con normalidad.' });
      await this.router.navigateByUrl('/conexiones');
    } catch (e) {
      if (e instanceof ApiError && (e.code === 'password_reused' || e.code === 'weak_password')) {
        this.error.set(e.code);
      } else if (e instanceof ApiError && e.status === 401) {
        // El token restringido venció: hay que pedir otra contraseña temporal.
        this.toast.push({ type: 'error', title: 'La sesión venció', description: 'Pide al administrador una nueva contraseña temporal.' });
        await this.auth.logout();
      } else if (e instanceof ApiError && e.status === 429) {
        this.toast.push({ type: 'error', title: 'Demasiados intentos', description: 'Espera un momento e intenta de nuevo.' });
      } else {
        this.toast.push({ type: 'error', title: 'No se pudo guardar', description: e instanceof ApiError ? errorText(e.code) : 'Revisa tu conexión.' });
      }
    } finally {
      this.busy.set(false);
    }
  }
}
