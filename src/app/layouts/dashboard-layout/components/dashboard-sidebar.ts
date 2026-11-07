import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { UnassignedService } from '../../../core/services/unassigned.service';
import { AppLogo } from '../../../shared/components/app-logo/app-logo';
import { MaterialIcon } from '../../../shared/components/material-icon/material-icon';

interface NavItem {
  link: string;
  label: string;
  icon?: string;
  /** Subnivel (p. ej. "Sin clasificar" bajo Procesos). */
  child?: boolean;
  exact?: boolean;
  badge?: 'unassigned';
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    label: 'Trabajo diario',
    items: [
      { link: '/documents', label: 'Bandeja de providencias', icon: 'move_to_inbox' },
      { link: '/cases', label: 'Procesos', icon: 'folder_managed', exact: false },
      { link: '/cases/sin-clasificar', label: 'Sin clasificar', child: true, badge: 'unassigned' },
    ],
  },
  {
    label: 'Configuración',
    items: [
      { link: '/conexiones', label: 'Conexiones de correo', icon: 'alternate_email' },
      { link: '/configuracion/entidad', label: 'Entidad', icon: 'domain' },
    ],
  },
];

/** Navegación sobre papel; la sección activa se marca como la pestaña de un expediente. */
@Component({
  selector: 'app-dashboard-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, MaterialIcon, AppLogo],
  template: `
    <aside
      class="fixed left-0 top-0 h-full w-60 bg-background z-50 flex flex-col border-r border-outline-variant/70"
    >
      <div class="h-14 px-4 flex items-center shrink-0">
        <app-logo size="sm" />
      </div>
      <nav class="flex flex-col gap-5 pt-3 pr-3" aria-label="Principal">
        @for (g of nav; track g.label) {
          <div class="flex flex-col gap-0.5">
            <p class="m-0 mb-1 pl-4 text-caption text-on-surface-variant">{{ g.label }}</p>
            @for (it of g.items; track it.link) {
              <a
                [routerLink]="it.link"
                routerLinkActive="bg-surface-container-lowest! text-primary! font-medium shadow-[inset_3px_0_0_var(--color-primary)]"
                [routerLinkActiveOptions]="{ exact: it.exact ?? true }"
                class="flex items-center gap-2 rounded-r-[4px] text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors no-underline"
                [class]="
                  it.child
                    ? 'ml-6 pl-4 pr-2 py-1.5 text-body-compact'
                    : 'pl-4 pr-2 py-2 text-label-default'
                "
              >
                @if (it.icon) {
                  <app-material-icon [name]="it.icon" [size]="17" />
                }
                <span class="flex-1">{{ it.label }}</span>
                @if (it.badge === 'unassigned' && unassigned.total() > 0) {
                  <span
                    class="min-w-5 px-1.5 py-0.5 rounded-full bg-error text-on-error text-[11px] leading-none font-semibold text-center tabular-nums"
                    [attr.aria-label]="unassigned.total() + ' correos sin clasificar'"
                    >{{ unassigned.total() }}</span
                  >
                }
              </a>
            }
          </div>
        }
      </nav>
    </aside>
  `,
})
export class DashboardSidebar implements OnInit {
  readonly unassigned = inject(UnassignedService);
  readonly nav = NAV;

  ngOnInit(): void {
    void this.unassigned.refresh();
  }
}
