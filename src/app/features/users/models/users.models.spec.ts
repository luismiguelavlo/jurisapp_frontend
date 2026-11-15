import type { TenantMember } from './users.models';
import { canActOn, displayName, expiryLabel, grantableRoles, initials } from './users.models';

const member = (over: Partial<TenantMember> = {}): TenantMember => ({
  id: 'u-1',
  email: 'laura@entidad.co',
  role: 'member',
  is_active: true,
  first_name: 'Laura',
  last_name: 'Valencia',
  job_title: null,
  status: 'active',
  password_change_required: false,
  last_login_at: null,
  invited_by: null,
  status_changed_at: null,
  status_changed_by: null,
  created_at: null,
  updated_at: null,
  receives_assignments: false,
  ...over,
});

describe('users.models', () => {
  it('muestra el nombre y, si no hay, el correo', () => {
    expect(displayName(member())).toBe('Laura Valencia');
    expect(displayName(member({ first_name: null, last_name: null }))).toBe('laura@entidad.co');
    expect(initials(member())).toBe('LV');
    expect(initials(member({ first_name: null, last_name: null }))).toBe('L');
  });

  it('aplica las reglas de permisos de SPEC 22', () => {
    const owner = member({ id: 'o', role: 'owner' });
    const admin = member({ id: 'a', role: 'admin' });
    expect(canActOn('member', 'x', admin)).toBe(false);
    expect(canActOn('admin', 'x', owner)).toBe(false);
    expect(canActOn('admin', 'x', admin)).toBe(true);
    expect(canActOn('owner', 'x', owner)).toBe(true);
    // Nadie se modifica a sí mismo por /users/{id}.
    expect(canActOn('owner', 'o', owner)).toBe(false);
  });

  it('el auxiliar no gestiona a nadie y el admin sí gestiona auxiliares (SPEC 23)', () => {
    const aux = member({ id: 'x2', role: 'auxiliar' });
    expect(canActOn('auxiliar', 'x', member())).toBe(false);
    expect(canActOn('admin', 'a', aux)).toBe(true);
    expect(grantableRoles('admin')).toContain('auxiliar');
  });

  it('solo el owner concede el rol owner', () => {
    expect(grantableRoles('owner')).toContain('owner');
    expect(grantableRoles('admin')).not.toContain('owner');
  });

  it('describe el vencimiento en futuro y pasado', () => {
    const in5h = new Date(Date.now() + 5 * 3_600_000 + 60_000).toISOString();
    const ago3d = new Date(Date.now() - 72 * 3_600_000).toISOString();
    expect(expiryLabel(in5h)).toBe('Vence en 5 h');
    expect(expiryLabel(ago3d)).toBe('Venció hace 3 d');
  });
});
