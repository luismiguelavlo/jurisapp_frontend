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
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { ThemeToggle } from '../../../shared/components/theme-toggle/theme-toggle';
import { LoginCard } from './components/login-card/login-card';
import { SecurityNotice } from './components/security-notice/security-notice';
import type { LoginCredentials, LoginSimulatorState } from './models/login.models';

@Component({
  selector: 'app-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StatusBadge, ThemeToggle, LoginCard, SecurityNotice],
  host: {
    class: 'flex-1 flex items-center justify-center px-margin-desktop py-space-xl w-full',
  },
  template: `
    <div
      class="flex flex-col w-full items-center justify-center min-h-[calc(100vh-140px)] px-space-md py-space-md selection:bg-secondary-container selection:text-on-secondary-fixed"
    >
      <div class="w-full max-w-[360px] mb-space-md flex items-center justify-between text-caption">
        <app-status-badge />
        <app-theme-toggle variant="labeled" />
      </div>

      <app-login-card
        [state]="uiState()"
        [countdown]="countdown()"
        [loading]="loading()"
        (submitted)="onLoginSubmit($event)"
      />

      <app-security-notice />
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
