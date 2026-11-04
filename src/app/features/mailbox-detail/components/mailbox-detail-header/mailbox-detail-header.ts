import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';
import type { ConnectionHealth, MailboxDetail } from '../../models/mailbox-detail.models';

@Component({
  selector: 'app-mailbox-detail-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MaterialIcon],
  template: `
    <nav class="flex items-center gap-space-xs text-caption text-on-surface-variant">
      <a
        routerLink="/conexiones"
        class="hover:text-on-surface transition-colors flex items-center gap-1"
      >
        <app-material-icon name="arrow_back" [size]="14" />
        <span>Conexiones de correo</span>
      </a>
      <span>/</span>
      <span class="text-on-surface font-medium truncate">{{ mailbox().email }}</span>
    </nav>

    <header class="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
      <div class="flex flex-col gap-space-xs">
        <div class="flex items-center gap-space-sm flex-wrap">
          <h1 class="text-headline-lg text-on-surface font-semibold tracking-tight m-0">
            {{ mailbox().email }}
          </h1>
          <span
            class="h-[22px] px-space-xs inline-flex items-center gap-1 rounded-[6px] bg-surface-container-high text-on-surface-variant text-label-compact"
          >
            <app-material-icon [name]="mailbox().providerIcon" [size]="13" />
            {{ mailbox().providerLabel }}
          </span>
          <span
            class="h-[22px] px-space-xs inline-flex items-center gap-1.5 rounded-[6px] text-label-compact font-medium"
            [class]="statusBadgeClass()"
          >
            <span class="w-1.5 h-1.5 rounded-full" [class]="statusDotClass()"></span>
            <span>{{ statusLabel() }}</span>
          </span>
        </div>
        <p class="text-body-compact text-on-surface-variant mb-0">
          Identificador clínico:
          <span class="font-mono text-[12px] bg-surface-container-low px-1 py-0.5 rounded-[4px]">{{
            mailbox().clinicalId
          }}</span>
          · Prioridad de ingesta asistencial: {{ mailbox().priorityLabel }}
        </p>
      </div>

      <div>
        @if (session.canManage()) {
          <div class="flex items-center gap-space-xs">
            <button
              type="button"
              class="h-9 px-space-md rounded-[6px] bg-surface-container-lowest text-on-surface hover:bg-surface-container-low text-label-default transition-colors flex items-center gap-space-xs cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              [disabled]="testing()"
              (click)="testConnection.emit()"
            >
              <app-material-icon
                [name]="testing() ? 'refresh' : 'wifi_tethering'"
                [size]="16"
                [className]="testing() ? 'animate-spin' : ''"
              />
              <span>{{ testing() ? 'Comprobando...' : 'Probar conexión' }}</span>
            </button>
            <button
              type="button"
              class="h-9 px-space-md rounded-[6px] bg-primary-container text-on-primary hover:opacity-95 text-label-default transition-all flex items-center gap-space-xs cursor-pointer"
              (click)="sync.emit()"
            >
              <app-material-icon name="sync" [size]="16" />
              <span>Sincronizar</span>
            </button>
            <button
              type="button"
              class="h-9 px-space-sm rounded-[6px] text-error hover:bg-error-container/30 text-label-default transition-colors flex items-center gap-1 cursor-pointer"
              (click)="disconnect.emit()"
            >
              <app-material-icon name="link_off" [size]="16" />
              <span>Desconectar</span>
            </button>
          </div>
        } @else {
          <div
            class="flex items-center gap-space-xs bg-surface-container-high px-space-sm py-1.5 rounded-[6px]"
          >
            <app-material-icon name="visibility" [size]="16" className="text-outline" />
            <span class="text-label-compact text-on-surface-variant font-medium"
              >Modo solo lectura (Member)</span
            >
          </div>
        }
      </div>
    </header>
  `,
})
export class MailboxDetailHeader {
  readonly session = inject(AuthService);

  readonly mailbox = input.required<MailboxDetail>();
  readonly health = input.required<ConnectionHealth>();
  readonly testing = input(false);

  readonly testConnection = output<void>();
  readonly sync = output<void>();
  readonly disconnect = output<void>();

  readonly statusLabel = computed(() => {
    switch (this.health()) {
      case 'reauth':
        return 'Requiere reautorización';
      case 'error':
        return 'Error de sincronización';
      default:
        return 'Activa';
    }
  });

  readonly statusBadgeClass = computed(() => {
    switch (this.health()) {
      case 'reauth':
        return 'bg-tertiary-container/20 text-tertiary';
      case 'error':
        return 'bg-error-container/40 text-error';
      default:
        return 'bg-secondary-container text-on-secondary-container';
    }
  });

  readonly statusDotClass = computed(() => {
    switch (this.health()) {
      case 'reauth':
        return 'bg-tertiary';
      case 'error':
        return 'bg-error';
      default:
        return 'bg-primary-container';
    }
  });
}
