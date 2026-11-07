import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { RadicadoMark } from '../../../shared/components/radicado-mark/radicado-mark';
import { LoginCard } from './components/login-card/login-card';
import { SecurityNotice } from './components/security-notice/security-notice';
import type { LoginCredentials, LoginSimulatorState } from './models/login.models';

@Component({
  selector: 'app-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RadicadoMark, LoginCard, SecurityNotice],
  host: {
    class: 'flex-1 flex w-full',
  },
  template: `
    <div
      class="w-full min-w-0 max-w-[1120px] mx-auto px-4 md:px-8 py-10 lg:py-16 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10 lg:gap-20 items-center"
    >
      <section class="min-w-0 flex flex-col gap-8 max-w-[34rem]">
        <h1 class="m-0 text-[34px] leading-[40px] sm:text-[44px] sm:leading-[50px] text-on-surface">
          Cada tutela de tu entidad, con el término de cada auto a la vista.
        </h1>
        <p class="m-0 text-body-default text-on-surface-variant max-w-[30rem] text-[15px] leading-6">
          JurisApp lee los correos de los juzgados, agrupa las providencias por radicado y te dice
          cuáles exigen respuesta y hasta cuándo.
        </p>
        <figure class="m-0 flex flex-col gap-3 pt-6 border-t border-outline-variant">
          <app-radicado-mark value="11001310300120260012300" size="lg" [annotated]="true" />
          <figcaption class="text-caption text-on-surface-variant">
            Así se lee un radicado. Todo lo que llega con el mismo número queda en un solo
            expediente.
          </figcaption>
        </figure>
      </section>

      <div class="min-w-0 order-first lg:order-none flex flex-col items-stretch gap-4 w-full max-w-[380px] justify-self-center lg:justify-self-end">
        <app-login-card
          [state]="uiState()"
          [countdown]="countdown()"
          [loading]="loading()"
          (submitted)="onLoginSubmit($event)"
        />
        <app-security-notice />
      </div>
    </div>
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private countdownSub: Subscription | null = null;

  readonly uiState = signal<LoginSimulatorState>('normal');
  readonly countdown = signal(0);
  readonly loading = signal(false);

  constructor() {
    this.destroyRef.onDestroy(() => this.stopCountdown());
  }

  async onLoginSubmit(credentials: LoginCredentials): Promise<void> {
    this.loading.set(true);
    this.uiState.set('normal');
    this.stopCountdown();

    try {
      await this.auth.login(credentials.tenant, credentials.email, credentials.password);
      await this.router.navigateByUrl('/conexiones');
    } catch (error) {
      const mapped = this.auth.mapLoginError(error);
      if (mapped.kind === 'invalid') {
        this.uiState.set('error');
      } else if (mapped.kind === 'rateLimit') {
        this.startCountdown(mapped.retryAfter ?? 42);
      } else {
        this.toast.push({
          type: 'error',
          title: 'Error de acceso',
          description: 'Ocurrió un error. Intenta de nuevo.',
        });
      }
    } finally {
      this.loading.set(false);
    }
  }

  private startCountdown(seconds: number): void {
    this.uiState.set('rateLimit');
    this.countdown.set(seconds);
    this.countdownSub = interval(1000).subscribe(() => {
      const next = this.countdown() - 1;
      if (next <= 0) {
        this.stopCountdown();
        this.uiState.set('normal');
        return;
      }
      this.countdown.set(next);
    });
  }

  private stopCountdown(): void {
    this.countdownSub?.unsubscribe();
    this.countdownSub = null;
  }
}
