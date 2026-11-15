import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent, merge } from 'rxjs';
import { formatRelativeTime } from '../../../../core/api/labels';
import { formatBogotaDate, formatBogotaDateTime } from '../../../../core/utils/date-format';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';
import { RowMenu, type RowMenuAction } from '../../../../shared/components/row-menu/row-menu';
import {
  ROLE_LABEL,
  STATUS_LABEL,
  canActOn,
  type MemberAction,
  type TenantMember,
  type UserRole,
} from '../../models/users.models';
import { UserIdentity } from '../user-identity/user-identity';

interface RowAction extends RowMenuAction {
  id: MemberAction;
}

const RAIL: Record<TenantMember['status'], string> = {
  active: '',
  suspended: 'shadow-[inset_3px_0_0_#d08a1e]',
  removed: 'shadow-[inset_3px_0_0_var(--color-outline-variant)]',
};

@Component({
  selector: 'app-users-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon, RowMenu, UserIdentity],
  template: `
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse" [class]="adminView() ? 'min-w-[820px]' : 'min-w-[560px]'">
        <thead>
          <tr class="text-caption text-on-surface-variant border-b border-outline-variant/70">
            <th class="py-2.5 pl-6 pr-4 font-medium" scope="col">Persona</th>
            <th class="py-2.5 px-4 font-medium" scope="col">Cargo</th>
            <th class="py-2.5 px-4 font-medium" scope="col">Rol</th>
            <th class="py-2.5 px-4 font-medium" scope="col">Estado</th>
            @if (adminView()) {
              <th class="py-2.5 px-4 font-medium whitespace-nowrap" scope="col">Último acceso</th>
              <th class="py-2.5 pl-4 pr-6" scope="col"><span class="sr-only">Acciones</span></th>
            }
          </tr>
        </thead>
        <tbody>
          @for (u of users(); track u.id) {
            @let gone = u.status === 'removed';
            <tr class="border-b border-outline-variant/40 last:border-b-0 align-middle hover:bg-surface-container-low/50">
              <td class="py-3 pl-6 pr-4 max-w-[300px]" [class]="rail[u.status]">
                <app-user-identity [person]="u" [muted]="gone" [isSelf]="u.id === meId()" />
              </td>
              <td class="py-3 px-4 text-body-compact" [class]="u.job_title ? 'text-on-surface' : 'text-on-surface-variant/70'">
                {{ u.job_title || 'Sin cargo' }}
              </td>
              <td class="py-3 px-4">
                <span class="inline-flex items-center gap-1 text-body-compact" [class]="u.role === 'owner' ? 'text-primary font-medium' : 'text-on-surface'">
                  @if (u.role !== 'member') {
                    <app-material-icon [name]="u.role === 'owner' ? 'verified_user' : 'shield_person'" [size]="15" />
                  }
                  {{ roleLabel[u.role] }}
                </span>
              </td>
              <td class="py-3 px-4">
                <span class="block text-body-compact font-medium" [class]="statusInk(u)">{{ statusLabel[u.status] }}</span>
                @if (u.status !== 'active' && u.status_changed_at) {
                  <span class="block text-caption text-on-surface-variant">Desde el {{ formatDate(u.status_changed_at) }}</span>
                } @else if (u.password_change_required) {
                  <span class="block text-caption text-tertiary">Contraseña temporal sin usar</span>
                }
              </td>
              @if (adminView()) {
                <td class="py-3 px-4 whitespace-nowrap">
                  <time
                    class="text-body-compact"
                    [class]="u.last_login_at ? 'text-on-surface' : 'text-on-surface-variant'"
                    [attr.title]="u.last_login_at ? formatDateTime(u.last_login_at) : null"
                    >{{ u.last_login_at ? relative(u.last_login_at) : 'Nunca ha entrado' }}</time
                  >
                </td>
                <td class="py-2.5 pl-4 pr-6">
                  <div class="flex items-center justify-end gap-1">
                    @if (canAct(u)) {
                      @if (gone) {
                        <button
                          type="button"
                          class="h-8 px-3 rounded-[4px] text-label-compact text-primary bg-transparent hover:bg-surface-container border-0 cursor-pointer whitespace-nowrap"
                          (click)="action.emit({ user: u, action: 'reinvite' })"
                        >
                          Volver a invitar
                        </button>
                      } @else {
                        <button
                          type="button"
                          class="w-8 h-8 inline-flex items-center justify-center rounded-[4px] text-on-surface-variant hover:text-on-surface hover:bg-surface-container border-0 bg-transparent cursor-pointer"
                          [attr.aria-label]="'Acciones para ' + u.email"
                          [attr.aria-expanded]="menu()?.user?.id === u.id"
                          (click)="toggleMenu(u, $event)"
                        >
                          <app-material-icon name="more_horiz" [size]="18" />
                        </button>
                      }
                    } @else if (u.id === meId()) {
                      <span class="text-caption text-on-surface-variant pr-1">Edítate en Mi perfil</span>
                    }
                  </div>
                </td>
              }
            </tr>
          } @empty {
            <tr>
              <td [attr.colspan]="adminView() ? 6 : 4" class="px-6 py-8 text-body-compact text-on-surface-variant">
                {{ emptyText() }}
              </td>
            </tr>
          }
        </tbody>
      </table>

      @if (menu(); as m) {
        <app-row-menu
          [actions]="m.actions"
          [top]="m.top"
          [left]="m.left"
          (actionSelect)="onMenu(m.user, $event)"
        />
      }
    </div>
  `,
})
export class UsersTable {
  private readonly destroyRef = inject(DestroyRef);

  readonly users = input.required<ReadonlyArray<TenantMember>>();
  readonly meId = input<string | null>(null);
  readonly myRole = input<UserRole | null>(null);
  readonly adminView = input(false);
  readonly emptyText = input('No hay usuarios con este filtro.');
  readonly action = output<{ user: TenantMember; action: MemberAction }>();

  readonly menu = signal<{ user: TenantMember; actions: RowAction[]; top: number; left: number } | null>(null);

  readonly roleLabel = ROLE_LABEL;
  readonly statusLabel = STATUS_LABEL;
  readonly rail = RAIL;
  readonly relative = formatRelativeTime;
  readonly formatDate = formatBogotaDate;
  readonly formatDateTime = formatBogotaDateTime;

  constructor() {
    merge(fromEvent(document, 'click'), fromEvent(window, 'resize'), fromEvent(window, 'scroll', { capture: true }))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.menu.set(null));
  }

  canAct(u: TenantMember): boolean {
    return canActOn(this.myRole(), this.meId(), u);
  }

  statusInk(u: TenantMember): string {
    if (u.status === 'suspended') return 'text-tertiary';
    if (u.status === 'removed') return 'text-on-surface-variant';
    return 'text-[#2f7049]';
  }

  toggleMenu(user: TenantMember, event: MouseEvent): void {
    event.stopPropagation();
    if (this.menu()?.user.id === user.id) {
      this.menu.set(null);
      return;
    }
    const btn = event.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    const width = 192;
    const height = 176;
    const left = Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8);
    const top = rect.bottom + 4 + height > window.innerHeight - 8 ? Math.max(8, rect.top - height - 4) : rect.bottom + 4;
    this.menu.set({ user, actions: this.actionsFor(user), top, left });
  }

  onMenu(user: TenantMember, a: RowMenuAction): void {
    this.menu.set(null);
    this.action.emit({ user, action: a.id as MemberAction });
  }

  private actionsFor(u: TenantMember): RowAction[] {
    const toggle: RowAction =
      u.status === 'suspended'
        ? { id: 'reactivate', label: 'Reactivar', icon: 'play_circle', tone: 'primary' }
        : { id: 'suspend', label: 'Suspender acceso', icon: 'pause_circle' };
    return [
      { id: 'edit', label: 'Editar', icon: 'edit' },
      { id: 'reset-password', label: 'Dar contraseña temporal', icon: 'key' },
      toggle,
      { id: 'remove', label: 'Eliminar', icon: 'person_remove', tone: 'error' },
    ];
  }
}
