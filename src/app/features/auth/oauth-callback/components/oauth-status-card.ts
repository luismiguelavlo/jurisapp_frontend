import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';
import {
  OAUTH_ERROR_STATES,
  type OauthSimulatorState,
} from '../models/oauth-callback.models';
import { OauthErrorView } from './oauth-error-view';
import { OauthSuccessView } from './oauth-success-view';

@Component({
  selector: 'app-oauth-status-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon, OauthSuccessView, OauthErrorView],
  template: `
    <div
      class="w-full max-w-[480px] bg-surface-container-lowest rounded-xl shadow-md p-space-xl flex flex-col relative overflow-hidden transition-all duration-200"
    >
      <div
        class="absolute top-0 left-0 right-0 h-1"
        [class]="isSuccess() ? 'bg-primary' : 'bg-error'"
      ></div>

      @if (isSuccess()) {
        <app-oauth-success-view />
      } @else if (errorDetails(); as details) {
        <app-oauth-error-view [details]="details" (retry)="retry.emit()" />
      }

      <div
        class="mt-space-lg pt-space-sm flex items-center justify-center gap-2 text-outline text-caption text-center"
      >
        <app-material-icon name="lock" [size]="14" />
        <span>Cifrado mTLS 1.3 de extremo a extremo · BAA firmado con Microsoft 365</span>
      </div>
    </div>
  `,
})
export class OauthStatusCard {
  readonly state = input.required<OauthSimulatorState>();
  readonly retry = output<void>();

  readonly isSuccess = computed(() => this.state() === 'success');

  readonly errorDetails = computed(() => {
    const current = this.state();
    if (current === 'success') {
      return null;
    }
    return OAUTH_ERROR_STATES[current];
  });
}
