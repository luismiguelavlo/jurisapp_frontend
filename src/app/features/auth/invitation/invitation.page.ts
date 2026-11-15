import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ToastService } from '../../../core/services/toast.service';
import { MaterialIcon } from '../../../shared/components/material-icon/material-icon';
import { BTN } from '../../../shared/ui/ui-classes';
import { ApiError } from '../../../core/api/client';
import { authApi } from '../../../core/api/endpoints';
import { errorText } from '../../../core/api/errors';
import { AuthService } from '../../../core/services/auth.service';
import type { InvitationPreview } from '../../users/models/users.models';
import { AuthCard } from '../components/auth-card/auth-card';
import {
  AcceptInvitationForm,
  type AcceptError,
  type AcceptPayload,
} from './components/accept-invitation-form/accept-invitation-form';
import { InvitationLetter } from './components/invitation-letter/invitation-letter';

/**
 * {APP_PUBLIC_URL}/invitacion#token=XXXX. El token va en el fragmento para que no llegue a ningún servidor.
 */
@Component({
  selector: 'app-invitation-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AuthCard, AcceptInvitationForm, InvitationLetter, MaterialIcon, RouterLink],
  host: { class: 'flex-1 flex w-full' },
  template: `
    @if (state() === 'loading') {
      <div class="w-full flex items-center justify-center py-24">
        <p class="m-0 text-body-default text-on-surface-variant">Revisando el enlace…</p>
      </div>
    } @else if (preview(); as p) {
      <div
        class="w-full min-w-0 max-w-[1120px] mx-auto px-4 md:px-8 py-10 lg:py-16 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-10 lg:gap-20 items-center"
      >
        <app-invitation-letter [preview]="p" />
        <div class="min-w-0 w-full max-w-[400px] justify-self-center lg:justify-self-end">
          <app-auth-card
            [title]="p.account_exists ? 'Únete con tu cuenta' : 'Crea tu contraseña'"
            [description]="p.account_exists ? null : 'Con ella entrarás a JurisApp desde ahora. Revisa que tu nombre esté bien escrito.'"
          >
            <app-accept-invitation-form [preview]="p" [error]="error()" [busy]="busy()" (submitted)="accept($event)" />
          </app-auth-card>
        </div>
      </div>
    } @else {
      <div class="w-full max-w-[440px] mx-auto px-4 py-16">
        @switch (problem()) {
          @case ('missing') {
            <app-auth-card title="El enlace llegó incompleto">
              <div class="flex flex-col gap-4">
                <p class="m-0 text-body-default text-on-surface">
                  Abre la invitación directamente desde el correo, o pide que te compartan el enlace completo (termina
                  en <code class="text-body-compact">#token=…</code>).
                </p>
                <p class="m-0 text-body-compact text-on-surface-variant">
                  Copiar la dirección desde la barra del navegador después de abrir el enlace no sirve: por seguridad
                  la quitamos de ahí.
                </p>
                <a routerLink="/login" [class]="btn.outline + ' no-underline self-start'">Ir a iniciar sesión</a>
              </div>
            </app-auth-card>
          }
          @case ('rate_limited') {
            <app-auth-card title="Demasiados intentos">
              <div class="flex flex-col gap-4">
                <p class="m-0 text-body-default text-on-surface">
                  Desde esta red se abrieron muchos enlaces que ya no sirven. Espera unos minutos y vuelve a intentarlo.
                </p>
                <button type="button" [class]="btn.primary + ' self-start'" (click)="retry()">Reintentar</button>
              </div>
            </app-auth-card>
          }
          @case ('network') {
            <app-auth-card title="No pudimos revisar el enlace">
              <div class="flex flex-col gap-4">
                <p class="m-0 text-body-default text-on-surface">
                  Revisa tu conexión a internet e intenta de nuevo. El enlace sigue siendo válido.
                </p>
                <button type="button" [class]="btn.primary + ' self-start'" (click)="retry()">Reintentar</button>
              </div>
            </app-auth-card>
          }
          @default {
            <app-auth-card title="Este enlace ya no sirve">
              <div class="flex flex-col gap-4">
                <p class="m-0 text-body-default text-on-surface">
                  Puede que ya lo hayas usado, que haya vencido (dura 72 horas) o que el administrador lo haya
                  anulado. Si te reenviaron la invitación, usa el enlace más reciente: el anterior deja de servir.
                </p>
                <p class="m-0 text-body-compact text-on-surface-variant flex items-start gap-2">
                  <app-material-icon name="forward_to_inbox" [size]="16" className="mt-0.5 shrink-0" />
                  Pide al administrador de tu entidad que te reenvíe la invitación. Si ya creaste tu contraseña, entra
                  normalmente.
                </p>
                <a routerLink="/login" [class]="btn.outline + ' no-underline self-start'">Ir a iniciar sesión</a>
              </div>
            </app-auth-card>
          }
        }
      </div>
    }
  `,
})
export class InvitationPage {
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  readonly btn = BTN;
  readonly state = signal<'loading' | 'ready'>('loading');
  readonly preview = signal<InvitationPreview | null>(null);
  /** Por qué no se muestra la invitación. */
  readonly problem = signal<InvitationProblem>('invalid');
  readonly error = signal<AcceptError>(null);
  readonly busy = signal(false);
  /**
   * El token se quita de la barra de direcciones en cuanto se lee (no queda en el historial ni se copia por error),
   * pero se guarda en esta pestaña: recargar la página no debe invalidar el enlace.
   */
  private readonly token = readToken();

  constructor() {
    if (location.hash) history.replaceState(null, '', location.pathname);
    void this.load();
  }

  retry(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    if (!this.token) {
      this.problem.set('missing');
      this.state.set('ready');
      return;
    }
    this.state.set('loading');
    try {
      this.preview.set(await authApi.previewInvitation(this.token));
    } catch (e) {
      this.preview.set(null);
      this.problem.set(problemOf(e));
      if (this.problem() === 'invalid') forgetToken();
    } finally {
      this.state.set('ready');
    }
  }

  async accept(payload: AcceptPayload): Promise<void> {
    if (!this.token || this.busy()) return;
    this.error.set(null);
    this.busy.set(true);
    try {
      await this.auth.acceptInvitation({ token: this.token, ...payload });
      forgetToken();
      this.toast.push({
        type: 'success',
        title: `Bienvenido a ${this.preview()?.tenant_name ?? 'JurisApp'}`,
        description: 'Tu sesión está iniciada.',
      });
      await this.router.navigateByUrl('/documents');
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 401) this.error.set('invalid_credentials');
        else if (e.status === 422) this.error.set(e.code === 'weak_password' ? 'weak_password' : 'invalid_name');
        else if (e.status === 429) this.error.set('rate_limited');
        else if (e.status === 404) {
          forgetToken();
          this.problem.set('invalid');
          this.preview.set(null);
        }
        else this.toast.push({ type: 'error', title: 'No se pudo aceptar', description: errorText(e.code) });
      } else {
        this.toast.push({ type: 'error', title: 'Sin conexión', description: 'Revisa tu conexión e intenta de nuevo.' });
      }
    } finally {
      this.busy.set(false);
    }
  }
}

type InvitationProblem = 'missing' | 'invalid' | 'rate_limited' | 'network';

const TOKEN_KEY = 'jurisapp.invitation-token';

function readToken(): string | null {
  const fromLink = new URLSearchParams(location.hash.slice(1)).get('token');
  try {
    if (fromLink) sessionStorage.setItem(TOKEN_KEY, fromLink);
    return fromLink ?? sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return fromLink;
  }
}

function forgetToken(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* almacenamiento no disponible */
  }
}

/** 404: el enlace ya no vale. 429: muchos tokens inválidos desde la red. Lo demás: problema de conexión. */
function problemOf(e: unknown): InvitationProblem {
  if (!(e instanceof ApiError)) return 'network';
  if (e.status === 404) return 'invalid';
  if (e.status === 429) return 'rate_limited';
  return e.status >= 500 || e.status === 0 ? 'network' : 'invalid';
}
