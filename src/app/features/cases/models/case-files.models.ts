import type { CaseFolder, CaseFolderItem, CaseItemKind } from '../../../core/api/types';
import { itemTipo } from '../../../core/api/case-tree';

export type CaseDetailTab = 'expediente' | 'timeline';

export type FolderMenuActionId =
  | 'new-subfolder'
  | 'rename'
  | 'move'
  | 'upload'
  | 'delete';

export type ItemMenuActionId =
  | 'open'
  | 'download'
  | 'move'
  | 'rename'
  | 'identify'
  | 'delete';

export interface ContextMenuAction<T extends string> {
  id: T;
  label: string;
  icon: string;
  tone?: 'default' | 'primary' | 'error';
  requiresAdmin?: boolean;
}

export interface FlatFolderRow {
  folder: CaseFolder;
  depth: number;
  /** Solo documentos directos de la carpeta (guía §2.5). */
  itemCount: number;
}

export function flattenFolders(folders: CaseFolder[], depth = 0): FlatFolderRow[] {
  const rows: FlatFolderRow[] = [];
  for (const folder of folders) {
    rows.push({ folder, depth, itemCount: folder.items.length });
    rows.push(...flattenFolders(folder.children, depth + 1));
  }
  return rows;
}

export function findFolder(folders: CaseFolder[], id: string): CaseFolder | null {
  for (const folder of folders) {
    if (folder.id === id) return folder;
    const nested = findFolder(folder.children, id);
    if (nested) return nested;
  }
  return null;
}

export function itemDisplayName(item: CaseFolderItem): string {
  if (item.kind === 'cuerpo') return 'Cuerpo del correo';
  return item.filename?.trim() || 'Archivo sin nombre';
}

export function itemTypeLabel(item: CaseFolderItem): string {
  return itemTipo(item);
}

export function itemIcon(item: CaseFolderItem): string {
  if (item.kind === 'cuerpo') return 'notes';
  const type = itemTipo(item);
  if (type === 'PDF') return 'picture_as_pdf';
  if (type === 'JPG' || type === 'PNG') return 'image';
  if (type === 'Word' || type === 'Excel') return 'description';
  return 'attach_file';
}

export function itemOrigenLabel(kind: CaseItemKind): string {
  return kind === 'subido' ? 'Subido' : 'Correo';
}

export function radicadoSourceLabel(source: string | null | undefined): string {
  switch (source) {
    case 'pdf_revisado':
      return 'PDF revisado';
    case 'pdf':
      return 'PDF';
    case 'asunto':
      return 'asunto';
    case 'cuerpo':
      return 'cuerpo';
    case 'manual':
      return 'asignación manual';
    default:
      return '—';
  }
}

export const FOLDER_MENU_ACTIONS: ReadonlyArray<ContextMenuAction<FolderMenuActionId>> = [
  { id: 'new-subfolder', label: 'Nueva subcarpeta', icon: 'create_new_folder', tone: 'primary' },
  { id: 'rename', label: 'Renombrar', icon: 'edit' },
  { id: 'move', label: 'Mover a…', icon: 'drive_file_move' },
  { id: 'upload', label: 'Subir archivo aquí', icon: 'upload_file', tone: 'primary' },
  { id: 'delete', label: 'Eliminar', icon: 'delete', tone: 'error', requiresAdmin: true },
];

export const ITEM_MENU_ACTIONS: ReadonlyArray<ContextMenuAction<ItemMenuActionId>> = [
  { id: 'open', label: 'Abrir', icon: 'visibility', tone: 'primary' },
  { id: 'download', label: 'Descargar', icon: 'download' },
  { id: 'identify', label: 'Ver identificación', icon: 'fact_check' },
  { id: 'move', label: 'Mover a…', icon: 'drive_file_move' },
  { id: 'rename', label: 'Renombrar', icon: 'edit' },
  { id: 'delete', label: 'Eliminar', icon: 'delete', tone: 'error', requiresAdmin: true },
];
