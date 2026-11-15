import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ApiError } from '../../core/api/client';
import { usersApi } from '../../core/api/endpoints';
import { errorText } from '../../core/api/errors';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';
import { MaterialIcon } from '../../shared/components/material-icon/material-icon';
import { SegmentedFilter, type SegmentOption } from '../../shared/components/segmented-filter/segmented-filter';
import { CredentialDialog, type Credential } from './components/credential-dialog/credential-dialog';
import { EditUserDialog } from './components/edit-user-dialog/edit-user-dialog';
import { InvitationsPanel } from './components/invitations-panel/invitations-panel';
import { InviteUserDialog, type InviteError } from './components/invite-user-dialog/invite-user-dialog';
import { UsersHeader } from './components/users-header/users-header';
import { UsersTable } from './components/users-table/users-table';
import {
  displayName,
  type Invitation,
  type InvitationIssued,
  type InviteDraft,
  type MemberAction,
  type MemberFilter,
  type MemberPatch,
  type TenantMember,
} from './models/users.models';

type Confirm =
  | { kind: 'suspend' | 'remove'; user: TenantMember }
  | { kind: 'reset-password'; user: TenantMember }
  | { kind: 'revoke'; invitation: Invitation };

@Component({
  selector: 'app-users-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    UsersHeader,
    UsersTable,
    InvitationsPanel,
    SegmentedFilter,
    MaterialIcon,
    InviteUserDialog,
    EditUserDialog,
    CredentialDialog,
    ConfirmDialog,
  ],
  template: `
    <div class="w-full max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
      <app-users-header [tenantName]="tenantName()" [canManage]="canManage()" (invite)="openInvite()" />

      <section class="flex flex-col gap-2" aria-label="Usuarios de la entidad">
        <div class="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-3 border-b border-outline-variant/70">
            <app-segmented-filter label="Estado" [options]="filterOptions()" [value]="filter()" (valueChange)="filter.set($event)" />
            <div class="relative w-full sm:w-72">
              <label class="sr-only" for="user-search">Buscar usuarios</label>
              <app-material-icon name="search" [size]="16" className="absolute left-2.5 top-2 text-on-surface-variant pointer-events-none" />
              <input
                id="user-search"
                type="search"
                class="w-full h-8 pl-8 pr-3 rounded-[4px] bg-surface-container-lowest border border-outline-variant text-body-compact text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                placeholder="Nombre, correo o cargo"
                [value]="query()"
                (input)="query.set($any($event.target).value)"
              />
            </div>
          </div>

          @if (loading()) {
            <p class="m-0 px-6 py-8 text-body-compact text-on-surface-variant">Cargando usuarios…</p>
          } @else if (loadError()) {
            <div class="px-6 py-8 flex flex-col items-start gap-3">
              <p class="m-0 text-body-compact text-on-surface">No se pudo cargar la lista de usuarios. {{ loadError() }}</p>
              <button type="button" class="h-8 px-3 rounded-[4px] text-label-compact text-primary bg-transparent hover:bg-surface-container border border-outline-variant cursor-pointer" (click)="reload()">Reintentar</button>
            </div>
          } @else {
          <app-users-table
            [users]="visible()"
            [meId]="meId()"
            [myRole]="myRole()"
            [adminView]="canManage()"
            [emptyText]="emptyText()"
            (action)="onAction($event.user, $event.action)"
          />
          }
        </div>
        @if (filter() === 'removed' || filter() === 'all') {
          <p class="m-0 px-1 text-caption text-on-surface-variant max-w-[80ch]">
            Los usuarios eliminados ya no pueden entrar, pero siguen apareciendo como autores de los correos,
            carpetas y revisiones que dejaron.
          </p>
        }
      </section>

      @if (canManage() && openInvitations().length > 0) {
        <app-invitations-panel
          [invitations]="openInvitations()"
          [canManage]="canManage()"
          (resend)="resend($event)"
          (revoke)="confirm.set({ kind: 'revoke', invitation: $event })"
        />
      }
    </div>

    @if (inviteOpen()) {
      <app-invite-user-dialog
        [myRole]="myRole()"
        [initial]="inviteInitial()"
        [error]="inviteError()"
        [sending]="busy()"
        (closed)="closeInvite()"
        (submitted)="invite($event)"
        (resendExisting)="resendPendingFor()"
      />
    }

    @if (editing(); as u) {
      <app-edit-user-dialog
        [user]="u"
        [myRole]="myRole()"
        [lockedAccount]="editLocked()"
        [error]="editError()"
        [saving]="busy()"
        (closed)="closeEdit()"
        (saved)="save(u, $event)"
      />
    }

    @if (credential(); as c) {
      <app-credential-dialog [credential]="c" (closed)="credential.set(null)" />
    }

    @if (confirm(); as c) {
      @switch (c.kind) {
        @case ('suspend') {
          <app-confirm-dialog
            [title]="'Suspender a ' + name(c.user) + '?'"
            confirmLabel="Suspender acceso"
            [busy]="busy()"
            (cancelled)="confirm.set(null)"
            (confirmed)="setStatus(c.user, 'suspended')"
          >
            <p class="m-0">Saldrá de la aplicación en este momento y no podrá volver a entrar hasta que lo reactives.</p>
            <p class="m-0 text-body-compact text-on-surface-variant">Sus procesos y revisiones no cambian.</p>
          </app-confirm-dialog>
        }
        @case ('remove') {
          <app-confirm-dialog
            [title]="'Eliminar a ' + name(c.user) + '?'"
            confirmLabel="Eliminar usuario"
            [busy]="busy()"
            tone="danger"
            (cancelled)="confirm.set(null)"
            (confirmed)="remove(c.user)"
          >
            <p class="m-0">Perderá el acceso de inmediato. Su nombre se conserva en lo que hizo, para que el historial siga completo.</p>
            <p class="m-0 text-body-compact text-on-surface-variant">Si más adelante vuelve, puedes invitarlo de nuevo.</p>
          </app-confirm-dialog>
        }
        @case ('reset-password') {
          <app-confirm-dialog
            [title]="'Dar una contraseña temporal a ' + name(c.user) + '?'"
            confirmLabel="Generar contraseña"
            [busy]="busy()"
            (cancelled)="confirm.set(null)"
            (confirmed)="resetPassword(c.user)"
          >
            <p class="m-0">Se cerrarán sus sesiones en todos los dispositivos. La contraseña temporal sirve para entrar una vez y vence en 24 horas.</p>
          </app-confirm-dialog>
        }
        @case ('revoke') {
          <app-confirm-dialog
            [title]="'Anular la invitación de ' + c.invitation.email + '?'"
            confirmLabel="Anular invitación"
            [busy]="busy()"
            tone="danger"
            (cancelled)="confirm.set(null)"
            (confirmed)="revoke(c.invitation)"
          >
            <p class="m-0">El enlace que recibió dejará de funcionar. Puedes enviarle una invitación nueva cuando quieras.</p>
          </app-confirm-dialog>
        }
      }
    }
  `,
})
export class UsersPage {
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly meId = this.auth.userId;
  readonly myRole = this.auth.role;
  readonly canManage = this.auth.canManage;
  readonly tenantName = computed(() => this.auth.tenantName() || 'tu entidad');

  readonly members = signal<TenantMember[]>([]);
  readonly invitations = signal<Invitation[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly busy = signal(false);

  readonly filter = signal<MemberFilter>('current');
  readonly query = signal('');

  readonly inviteOpen = signal(false);
  readonly inviteInitial = signal<Partial<InviteDraft> | null>(null);
  readonly inviteError = signal<InviteError>(null);
  private pendingConflictEmail: string | null = null;
  readonly editing = signal<TenantMember | null>(null);
  readonly editLocked = signal(false);
  readonly editError = signal<string | null>(null);
  readonly credential = signal<Credential | null>(null);
  readonly confirm = signal<Confirm | null>(null);

  readonly name = displayName;

  readonly filterOptions = computed<SegmentOption<MemberFilter>[]>(() => {
    const m = this.members();
    const n = (s: TenantMember['status']) => m.filter((u) => u.status === s).length;
    return [
      { value: 'current', label: `Activos ${n('active')}` },
      { value: 'suspended', label: `Suspendidos ${n('suspended')}` },
      { value: 'removed', label: `Eliminados ${n('removed')}` },
      { value: 'all', label: 'Todos' },
    ];
  });

  readonly visible = computed(() => {
    const f = this.filter();
    const q = this.query().trim().toLowerCase();
    return this.members()
      .filter((u) => (f === 'all' ? true : f === 'current' ? u.status === 'active' : u.status === f))
      .filter((u) => !q || `${displayName(u)} ${u.email} ${u.job_title ?? ''}`.toLowerCase().includes(q));
  });

  readonly emptyText = computed(() =>
    this.query().trim()
      ? `Nadie coincide con «${this.query().trim()}».`
      : this.filter() === 'suspended'
        ? 'No hay usuarios suspendidos.'
        : this.filter() === 'removed'
          ? 'No se ha eliminado a nadie.'
          : 'Todavía no hay usuarios. Invita al primero.',
  );

  readonly openInvitations = computed(() =>
    this.invitations().filter((i) => i.status === 'pending' || i.status === 'expired'),
  );

  constructor() {
    void this.reload();
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      // Sin filtro: todos (también eliminados); el filtro de estado y la búsqueda son locales.
      const [users, invitations] = await Promise.all([
        usersApi.list(),
        this.canManage() ? usersApi.invitations() : Promise.resolve<Invitation[]>([]),
      ]);
      this.members.set(users);
      this.invitations.set(invitations);
    } catch (e) {
      this.loadError.set(e instanceof ApiError ? errorText(e.code) : 'Revisa tu conexión.');
    } finally {
      this.loading.set(false);
    }
  }

  onAction(user: TenantMember, action: MemberAction): void {
    switch (action) {
      case 'edit':
        this.editLocked.set(false);
        this.editError.set(null);
        this.editing.set(user);
        break;
      case 'suspend':
      case 'remove':
      case 'reset-password':
        this.confirm.set({ kind: action, user });
        break;
      case 'reactivate':
        void this.setStatus(user, 'active');
        break;
      case 'reinvite':
        this.openInvite({
          email: user.email,
          first_name: user.first_name ?? '',
          last_name: user.last_name ?? '',
          job_title: user.job_title,
          role: user.role,
        });
        break;
    }
  }

  openInvite(initial: Partial<InviteDraft> | null = null): void {
    this.inviteInitial.set(initial);
    this.inviteError.set(null);
    this.inviteOpen.set(true);
  }

  closeInvite(): void {
    this.inviteOpen.set(false);
    this.pendingConflictEmail = null;
  }

  closeEdit(): void {
    this.editing.set(null);
    this.editError.set(null);
  }

  async invite(draft: InviteDraft): Promise<void> {
    this.inviteError.set(null);
    await this.run(async () => {
      try {
        const issued = await usersApi.invite(draft);
        this.inviteOpen.set(false);
        this.upsertInvitation(issued.invitation);
        this.showIssued(issued, false);
      } catch (e) {
        if (e instanceof ApiError) {
          if (e.code === 'user_already_member' || e.code === 'role_not_allowed') {
            this.inviteError.set(e.code);
            return;
          }
          if (e.code === 'invitation_already_pending') {
            this.pendingConflictEmail = draft.email.toLowerCase();
            this.inviteError.set(e.code);
            return;
          }
          if (e.status === 422) {
            this.inviteError.set('invalid');
            return;
          }
        }
        throw e;
      }
    });
  }

  async resendPendingFor(): Promise<void> {
    const email = this.pendingConflictEmail;
    this.closeInvite();
    if (!email) return;
    let inv = this.openInvitations().find((i) => i.email.toLowerCase() === email);
    if (!inv) {
      await this.refreshInvitations();
      inv = this.openInvitations().find((i) => i.email.toLowerCase() === email);
    }
    if (inv) await this.resend(inv);
  }

  async resend(inv: Invitation): Promise<void> {
    await this.run(async () => {
      const issued = await usersApi.resendInvitation(inv.id);
      this.upsertInvitation(issued.invitation);
      this.showIssued(issued, true);
    });
  }

  async revoke(inv: Invitation): Promise<void> {
    await this.run(async () => {
      await usersApi.revokeInvitation(inv.id);
      this.invitations.update((l) => l.filter((i) => i.id !== inv.id));
      this.confirm.set(null);
      this.toast.push({ type: 'success', title: 'Invitación anulada', description: inv.email });
    });
  }

  async save(user: TenantMember, patch: MemberPatch): Promise<void> {
    this.editError.set(null);
    await this.run(async () => {
      try {
        const updated = await usersApi.update(user.id, patch);
        this.replaceMember(updated);
        this.closeEdit();
        this.toast.push({
          type: 'success',
          title: 'Cambios guardados',
          description: patch.role ? `${displayName(updated)} tendrá que volver a iniciar sesión.` : displayName(updated),
        });
      } catch (e) {
        if (e instanceof ApiError && e.code === 'user_in_other_tenants') {
          // El nombre es de la cuenta: se bloquea y se deja guardar cargo y rol.
          this.editLocked.set(true);
          this.editError.set(
            'El nombre no se guardó: la cuenta pertenece también a otra organización. Puedes guardar el cargo y el rol.',
          );
          return;
        }
        if (e instanceof ApiError && (e.status === 403 || e.status === 409 || e.status === 422)) {
          this.editError.set(errorText(e.code));
          return;
        }
        throw e;
      }
    });
  }

  async setStatus(user: TenantMember, status: 'active' | 'suspended'): Promise<void> {
    await this.run(async () => {
      const updated = await usersApi.update(user.id, { status });
      this.replaceMember(updated);
      this.confirm.set(null);
      this.toast.push({
        type: status === 'active' ? 'success' : 'warn',
        title: status === 'active' ? 'Acceso reactivado' : 'Acceso suspendido',
        description: displayName(updated),
      });
    });
  }

  async remove(user: TenantMember): Promise<void> {
    await this.run(async () => {
      await usersApi.remove(user.id);
      this.confirm.set(null);
      // Baja lógica: sigue en la lista con status removed.
      try {
        this.replaceMember(await usersApi.get(user.id));
      } catch {
        this.replaceMember({ ...user, status: 'removed', is_active: false, status_changed_at: new Date().toISOString() });
      }
      this.toast.push({ type: 'error', title: 'Usuario eliminado', description: displayName(user) });
    });
  }

  async resetPassword(user: TenantMember): Promise<void> {
    await this.run(async () => {
      const temp = await usersApi.resetPassword(user.id);
      this.confirm.set(null);
      this.replaceMember({ ...user, password_change_required: true });
      this.credential.set({
        kind: 'password',
        name: displayName(user),
        value: temp.temporary_password,
        expiresAt: temp.expires_at,
      });
    });
  }

  private showIssued(issued: InvitationIssued, resent: boolean): void {
    const inv = issued.invitation;
    this.credential.set({
      kind: 'invitation',
      name: displayName(inv),
      email: inv.email,
      value: issued.invitation_url ?? `${location.origin}/invitacion#token=${issued.invitation_token}`,
      expiresAt: inv.expires_at,
      emailSent: issued.email_sent,
      resent,
    });
  }

  private async refreshInvitations(): Promise<void> {
    try {
      this.invitations.set(await usersApi.invitations());
    } catch {
      /* la lista se corrige en la próxima carga */
    }
  }

  private upsertInvitation(inv: Invitation): void {
    this.invitations.update((l) => [inv, ...l.filter((i) => i.id !== inv.id)]);
  }

  private replaceMember(u: TenantMember): void {
    this.members.update((l) => (l.some((m) => m.id === u.id) ? l.map((m) => (m.id === u.id ? u : m)) : [...l, u]));
  }

  /** Ejecuta una acción con estado ocupado; lo no manejado termina en un toast. */
  private async run(fn: () => Promise<void>): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await fn();
    } catch (e) {
      this.confirm.set(null);
      this.handleError(e);
    } finally {
      this.busy.set(false);
    }
  }

  private handleError(e: unknown): void {
    if (e instanceof ApiError) {
      if (e.status === 429) {
        this.toast.push({ type: 'error', title: 'Demasiadas solicitudes', description: 'Espera un momento e intenta de nuevo.' });
        return;
      }
      if (e.status === 404 || e.code === 'invitation_not_pending') void this.reload();
      this.toast.push({ type: 'error', title: 'No se pudo completar', description: errorText(e.code) });
      return;
    }
    this.toast.push({ type: 'error', title: 'Sin conexión', description: 'Revisa tu conexión e intenta de nuevo.' });
  }
}
