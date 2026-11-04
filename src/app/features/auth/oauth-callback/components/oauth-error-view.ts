import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';
import type { OauthErrorDetails } from '../models/oauth-callback.models';

@Component({
  selector: 'app-oauth-error-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MaterialIcon],
  template: `
    <div class="flex flex-col">
      <div class="flex items-center justify-between mb-space-lg">
        <div
          class="w-10 h-10 rounded-xl bg-error-container/40 flex items-center justify-center text-error"
        >
          <app-material-icon name="error" [size]="20" />
        </div>
        <div
          class="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-error-container/30 text-error text-label-compact font-medium"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-error"></span>
          Error de retorno
        </div>
      </div>

      <div class="flex flex-col gap-space-xs mb-space-lg">
        <h1 class="text-headline-md text-on-surface tracking-tight m-0">Error de autorización</h1>
        <p class="text-body-default text-on-surface-variant mb-0">{{ details().text }}</p>
      </div>

      <div class="bg-surface-container-low rounded-xl p-space-md mb-space-xl flex flex-col gap-2">
        <div class="flex items-center justify-between text-label-compact">
          <span class="text-outline">Código de incidencia</span>
          <span class="text-on-surface font-mono text-[12px] font-medium">{{ details().code }}</span>
        </div>
        <div class="flex items-center justify-between text-label-compact">
          <span class="text-outline">Acción sugerida</span>
          <span class="text-on-surface-variant">{{ details().remediation }}</span>
        </div>
      </div>

      <div class="flex flex-col gap-space-sm">
        <button
          type="button"
          class="w-full h-10 bg-primary hover:bg-primary-container text-on-primary text-label-default font-medium rounded-lg flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
          (click)="retry.emit()"
        >
          <app-material-icon name="refresh" [size]="16" />
          <span>Intentar de nuevo</span>
        </button>
        <a
          routerLink="/conexiones"
          class="w-full h-9 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface text-label-compact transition-colors flex items-center justify-center"
        >
          Volver a la lista
        </a>
      </div>
    </div>
  `,
})
export class OauthErrorView {
  readonly details = input.required<OauthErrorDetails>();
  readonly retry = output<void>();
}
