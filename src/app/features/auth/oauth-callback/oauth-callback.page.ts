import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { errorText } from '../../../core/api/errors';
import { MaterialIcon } from '../../../shared/components/material-icon/material-icon';
import { OauthErrorView } from './components/oauth-error-view';
import { OauthSuccessView } from './components/oauth-success-view';
import type { OauthErrorDetails } from './models/oauth-callback.models';

@Component({
  selector: 'app-oauth-callback-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MaterialIcon, OauthSuccessView, OauthErrorView],
  template: `
    <div class="max-w-[1120px] mx-auto p-space-xl flex flex-col items-center">
      <div
        class="w-full max-w-[480px] bg-surface-container-lowest rounded-xl shadow-md p-space-xl flex flex-col relative overflow-hidden"
      >
        <div
          class="absolute top-0 left-0 right-0 h-1"
          [class]="isSuccess() ? 'bg-primary' : 'bg-error'"
        ></div>

        @if (isSuccess()) {
          <app-oauth-success-view [mailboxId]="connectionId() ?? ''" />
        } @else if (errorDetails(); as details) {
          <app-oauth-error-view [details]="details" (retry)="goToConnections()" />
        }

        <div
          class="mt-space-lg pt-space-sm flex items-center justify-center gap-2 text-outline text-caption text-center"
        >
          <app-material-icon name="lock" [size]="14" />
          <span>Cifrado mTLS 1.3 de extremo a extremo · BAA firmado con Microsoft 365</span>
        </div>
      </div>

      <a
        routerLink="/conexiones"
        class="mt-space-md text-label-compact text-on-surface-variant hover:text-on-surface"
        >Volver a conexiones</a
      >
    </div>
  `,
})
export class OauthCallbackPage {
  private readonly router = inject(Router);

  readonly connectionId = signal<string | null>(null);
  readonly errorCode = signal<string | null>(null);

  readonly isSuccess = computed(() => this.connectionId() !== null && !this.errorCode());

  readonly errorDetails = computed<OauthErrorDetails | null>(() => {
    const code = this.errorCode();
    if (!code) {
      return null;
    }
    return {
      text: errorText(code),
      code: code.toUpperCase().startsWith('ERR_') ? code : `ERR_${code.toUpperCase()}`,
      remediation: 'Intenta de nuevo desde Conectar buzón',
    };
  });

  constructor() {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const id = params.get('connection_id');
    const code = params.get('code');

    history.replaceState(null, '', window.location.pathname);

    if (status === 'connected' && id) {
      this.connectionId.set(id);
      this.errorCode.set(null);
    } else {
      this.connectionId.set(null);
      this.errorCode.set(code ?? 'internal_error');
    }
  }

  goToConnections(): void {
    void this.router.navigateByUrl('/conexiones');
  }
}
