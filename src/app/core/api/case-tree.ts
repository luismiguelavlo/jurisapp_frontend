import type { CaseFolder, CaseFolderItem } from './types';

export function walk(
  folders: CaseFolder[],
  fn: (f: CaseFolder, parent: CaseFolder | null) => void,
  parent: CaseFolder | null = null,
): void {
  for (const f of folders) {
    fn(f, parent);
    walk(f.children, fn, f);
  }
}

export function treeStats(folders: CaseFolder[]): {
  carpetas: number;
  documentos: number;
  bytes: number;
  ultimo: string | null;
} {
  let carpetas = 0;
  let documentos = 0;
  let bytes = 0;
  let ultimo: string | null = null;
  walk(folders, (f) => {
    carpetas += 1;
    for (const i of f.items) {
      documentos += 1;
      bytes += i.size_bytes ?? 0;
      if (!ultimo || i.created_at > ultimo) ultimo = i.created_at;
    }
  });
  return { carpetas, documentos, bytes, ultimo };
}

export function subtreeHeight(f: CaseFolder): number {
  return 1 + Math.max(0, ...f.children.map(subtreeHeight));
}

/** Destinos válidos: no ella, no descendientes, y el subárbol no supera profundidad 5. */
export function canMoveFolderInto(
  moving: CaseFolder,
  target: CaseFolder | null,
): boolean {
  if (target) {
    let inside = false;
    walk([moving], (f) => {
      if (f.id === target.id) inside = true;
    });
    if (inside) return false;
  }
  const newDepth = (target?.depth ?? 0) + 1;
  return newDepth + subtreeHeight(moving) - 1 <= 5;
}

export function itemTipo(i: CaseFolderItem): string {
  if (i.kind === 'cuerpo') return 'Cuerpo del correo';
  const map: Record<string, string> = {
    'application/pdf': 'PDF',
    'image/jpeg': 'JPG',
    'image/png': 'PNG',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
  };
  return map[i.content_type ?? ''] ?? 'Archivo';
}

export function findFolderPath(
  folders: CaseFolder[],
  id: string,
  trail: CaseFolder[] = [],
): CaseFolder[] | null {
  for (const f of folders) {
    const next = [...trail, f];
    if (f.id === id) return next;
    const nested = findFolderPath(f.children, id, next);
    if (nested) return nested;
  }
  return null;
}

/** Filtro cliente: nombre de carpeta, filename o asunto del correo. */
export function folderMatchesQuery(folder: CaseFolder, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  if (folder.name.toLowerCase().includes(needle)) return true;
  if (folder.correo?.subject?.toLowerCase().includes(needle)) return true;
  return folder.items.some((i) =>
    (i.filename ?? 'cuerpo del correo').toLowerCase().includes(needle),
  );
}
