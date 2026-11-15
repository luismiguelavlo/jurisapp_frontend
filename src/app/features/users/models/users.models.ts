import type {
  Invitation,
  InvitationIn,
  InvitationIssued,
  InvitationPreview,
  InvitationStatus,
  MembershipStatus,
  Role,
  TemporaryPassword,
  TenantUser,
  TenantUserPatch,
} from '../../../core/api/types';

/** SPEC 22 (docs/integracion-gestion-usuarios.md). Alias locales sobre los tipos de la API. */
export type UserRole = Role;
export type TenantMember = TenantUser;
export type MemberPatch = TenantUserPatch;
export type InviteDraft = Required<Pick<InvitationIn, 'email' | 'first_name' | 'last_name' | 'role'>> & {
  job_title: string | null;
};
export type {
  Invitation,
  InvitationIssued,
  InvitationPreview,
  InvitationStatus,
  MembershipStatus,
  TemporaryPassword,
};

export type MemberFilter = 'current' | 'suspended' | 'removed' | 'all';

export type MemberAction = 'edit' | 'suspend' | 'reactivate' | 'reset-password' | 'remove' | 'reinvite';

export const ROLE_LABEL: Record<UserRole, string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  member: 'Miembro',
};

export const ROLE_HELP: Record<UserRole, string> = {
  owner: 'Todo lo de un administrador, y además puede nombrar a otros propietarios.',
  admin: 'Gestiona usuarios, buzones y la configuración de la entidad.',
  member: 'Revisa la bandeja y trabaja los procesos. No gestiona usuarios.',
};

export const STATUS_LABEL: Record<MembershipStatus, string> = {
  active: 'Activo',
  suspended: 'Suspendido',
  removed: 'Eliminado',
};

export function displayName(u: { first_name: string | null; last_name: string | null; email: string }): string {
  const name = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
  return name || u.email;
}

export function initials(u: { first_name: string | null; last_name: string | null; email: string }): string {
  const a = u.first_name?.trim()[0];
  const b = u.last_name?.trim()[0];
  if (a || b) return `${a ?? ''}${b ?? ''}`.toUpperCase();
  return u.email[0]?.toUpperCase() ?? '?';
}

/** Owner puede todo; admin solo sobre admin y member; nadie sobre sí mismo. */
export function canActOn(actorRole: UserRole | null, actorId: string | null, target: TenantMember): boolean {
  if (!actorRole || actorRole === 'member') return false;
  if (target.id === actorId) return false;
  if (actorRole === 'admin' && target.role === 'owner') return false;
  return true;
}

export function grantableRoles(actorRole: UserRole | null): UserRole[] {
  return actorRole === 'owner' ? ['member', 'admin', 'owner'] : ['member', 'admin'];
}

/** "vence en 5 h" / "venció hace 1 d". */
export function expiryLabel(iso: string): string {
  const diffH = (new Date(iso).getTime() - Date.now()) / 3_600_000;
  const abs = Math.abs(diffH);
  const span = abs < 1 ? `${Math.max(1, Math.round(abs * 60))} min` : abs < 48 ? `${Math.round(abs)} h` : `${Math.round(abs / 24)} d`;
  return diffH >= 0 ? `Vence en ${span}` : `Venció hace ${span}`;
}

export function expiresSoon(iso: string): boolean {
  const diffH = (new Date(iso).getTime() - Date.now()) / 3_600_000;
  return diffH >= 0 && diffH < 12;
}
