import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { UnassignedService } from '../../../core/services/unassigned.service';
import { MaterialIcon } from '../../../shared/components/material-icon/material-icon';

@Component({
  selector: 'app-dashboard-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, MaterialIcon],
  template: `
    <aside
      class="fixed left-0 top-0 h-full w-60 bg-surface-container-lowest z-50 flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.04)]"
    >
      <div class="flex flex-col">
        <div class="h-14 px-margin flex items-center gap-space-xs">
          <div
            class="w-5 h-5 rounded-[6px] bg-primary-container flex items-center justify-center text-on-primary"
          >
            <app-material-icon name="balance" [size]="14" />
          </div>
          <span class="text-headline-sm tracking-tight text-on-surface font-semibold"
            >salud-auto</span
          >
        </div>
        <div class="px-space-xs mt-space-xs">
          <nav class="flex flex-col gap-0.5">
            <a
              routerLink="/documents"
              routerLinkActive="bg-surface-container-low text-primary-container font-medium"
              class="flex items-center gap-space-xs px-space-xs py-space-xs rounded-[6px] text-label-default text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors"
            >
              <app-material-icon name="move_to_inbox" [size]="16" />
              <span>Bandeja de providencias</span>
            </a>

            <div class="flex flex-col">
              <a
                routerLink="/cases"
                routerLinkActive="bg-secondary-container/40 text-primary-container font-medium"
                [routerLinkActiveOptions]="{ exact: false }"
                class="flex items-center gap-space-xs px-space-xs py-space-xs rounded-[6px] text-label-default text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors"
              >
                <app-material-icon name="folder_managed" [size]="16" />
                <span>Procesos</span>
              </a>
              <div
                class="ml-5 pl-space-xs border-l border-outline-variant/30 flex flex-col gap-0.5 mt-0.5"
              >
                <a
                  routerLink="/cases/sin-clasificar"
                  routerLinkActive="bg-surface-container-low text-on-surface font-medium"
                  class="flex items-center justify-between gap-2 px-space-xs py-1.5 rounded-[6px] text-body-compact text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors"
                >
                  <span>Sin clasificar</span>
                  @if (unassigned.total() > 0) {
                    <span
                      class="bg-error-container text-on-error-container font-label-compact text-[11px] px-1.5 py-0.5 rounded-full leading-none"
                      >{{ unassigned.total() }}</span
                    >
                  }
                </a>
              </div>
            </div>

            <a
              routerLink="/conexiones"
              routerLinkActive="bg-surface-container-low text-primary-container font-medium"
              class="flex items-center gap-space-xs px-space-xs py-space-xs rounded-[6px] text-label-default text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors"
            >
              <app-material-icon name="alternate_email" [size]="16" />
              <span>Conexiones de correo</span>
            </a>
          </nav>
        </div>
      </div>
      <div class="p-space-sm bg-surface-container-lowest"></div>
    </aside>
  `,
})
export class DashboardSidebar implements OnInit {
  readonly unassigned = inject(UnassignedService);

  ngOnInit(): void {
    void this.unassigned.refresh();
  }
}
