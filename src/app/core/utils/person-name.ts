/** Persona con nombre opcional: usuarios, asignaciones, carga de revisores. */
export interface PersonName {
  first_name: string | null;
  last_name: string | null;
  email: string;
}

/** "Nombre Apellido", o el correo si no hay nombre. */
export function displayName(u: PersonName): string {
  const name = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
  return name || u.email;
}

export function initials(u: PersonName): string {
  const a = u.first_name?.trim()[0];
  const b = u.last_name?.trim()[0];
  if (a || b) return `${a ?? ''}${b ?? ''}`.toUpperCase();
  return u.email[0]?.toUpperCase() ?? '?';
}
