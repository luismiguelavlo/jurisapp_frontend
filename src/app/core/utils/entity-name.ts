/**
 * Normalización aproximada de nombres de entidad (para resaltar en pantalla).
 * El backend tiene su propia normalización (`nombre_normalizado`), que es la que manda.
 */
export function normalizeEntityName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\bs\.?\s?a\.?\s?s\.?\b|\bs\.?\s?a\.?\b|\bltda\.?\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** true si `nombre` contiene alguno de los nombres normalizados de la entidad. */
export function matchesEntity(nombre: string, normalizados: readonly string[]): boolean {
  const n = normalizeEntityName(nombre);
  if (!n) return false;
  return normalizados.some((e) => !!e && (n === e || ` ${n} `.includes(` ${e} `)));
}
