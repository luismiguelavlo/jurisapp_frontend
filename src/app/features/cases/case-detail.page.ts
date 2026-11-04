import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { canMoveFolderInto, treeStats } from '../../core/api/case-tree';
import { ApiError } from '../../core/api/client';
import { authApi, caseFilesApi, casesApi, documentsApi } from '../../core/api/endpoints';
import { errorText } from '../../core/api/errors';
import type {
  CaseDetail,
  CaseFolder,
  CaseFolderItem,
  CaseTrash,
} from '../../core/api/types';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { UnassignedService } from '../../core/services/unassigned.service';
import { formatRadicado } from '../../core/utils/date-format';
import { AssignCaseModal } from './components/assign-case-modal/assign-case-modal';
import { CaseContextMenu } from './components/case-context-menu/case-context-menu';
import { CaseFileViewer } from './components/case-file-viewer/case-file-viewer';
import { CaseFilesTable } from './components/case-files-table/case-files-table';
import { CaseFilesToolbar } from './components/case-files-toolbar/case-files-toolbar';
import { CaseFolderTree } from './components/case-folder-tree/case-folder-tree';
import { CaseMoveModal } from './components/case-move-modal/case-move-modal';
import {
  CaseNameModal,
  type CaseNameModalMode,
} from './components/case-name-modal/case-name-modal';
import { CaseSummaryHeader } from './components/case-summary-header/case-summary-header';
import { CaseTimeline } from './components/case-timeline/case-timeline';
import { CaseTrashDrawer } from './components/case-trash-drawer/case-trash-drawer';
import {
  CaseUploadModal,
  type UploadRow,
} from './components/case-upload-modal/case-upload-modal';
import {
  FOLDER_MENU_ACTIONS,
  ITEM_MENU_ACTIONS,
  findFolder,
  flattenFolders,
  itemDisplayName,
  type CaseDetailTab,
  type FolderMenuActionId,
  type ItemMenuActionId,
} from './models/case-files.models';

type FolderMenuState = {
  id: string;
  name: string;
  x: number;
  y: number;
  origen: 'correo' | 'manual';
};

type ItemMenuState = {
  item: CaseFolderItem;
  x: number;
  y: number;
};

type NameModalState = {
  mode: CaseNameModalMode;
  folderId?: string;
  itemId?: string;
  initialName: string;
  pathHint: string;
  parentId: string | null;
};

type MoveModalState =
  | { kind: 'folder'; id: string; name: string; disabledIds: Set<string> }
  | { kind: 'item'; id: string; name: string };

@Component({
  selector: 'app-case-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CaseSummaryHeader,
    CaseFilesToolbar,
    CaseFolderTree,
    CaseFilesTable,
    CaseTimeline,
    CaseContextMenu,
    CaseNameModal,
    CaseUploadModal,
    CaseMoveModal,
    CaseTrashDrawer,
    AssignCaseModal,
    CaseFileViewer,
  ],
  template: `
    <div
      class="w-full max-w-[1120px] mx-auto px-4 md:px-6 lg:px-8 py-6 flex flex-col gap-6 min-w-0"
    >
      @if (loading()) {
        <p class="text-body-default text-on-surface-variant m-0">Cargando expediente…</p>
      } @else if (error()) {
        <div class="p-4 rounded-xl bg-[#FEF2F2] text-[#991B1B]">
          {{ error() }}
          <button
            type="button"
            class="underline border-0 bg-transparent cursor-pointer text-inherit ml-2"
            (click)="reload()"
          >
            Reintentar
          </button>
        </div>
      } @else if (caso(); as c) {
        <app-case-summary-header
          [caso]="c"
          [folderCount]="stats().carpetas"
          [itemCount]="stats().documentos"
          [sizeBytes]="stats().bytes"
          [lastCreatedAt]="stats().ultimo"
          [accionante]="accionante()"
          (back)="goBack()"
        />

        <div
          class="flex items-center gap-1 border-b border-outline-variant/30"
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            class="px-3 py-2 font-label-default text-label-default border-0 bg-transparent cursor-pointer relative"
            [class]="
              tab() === 'expediente'
                ? 'text-primary-container'
                : 'text-on-surface-variant hover:text-on-surface'
            "
            [attr.aria-selected]="tab() === 'expediente'"
            (click)="setTab('expediente')"
          >
            Expediente
            @if (tab() === 'expediente') {
              <span
                class="absolute left-0 right-0 bottom-0 h-0.5 bg-primary-container rounded-full"
              ></span>
            }
          </button>
          <button
            type="button"
            role="tab"
            class="px-3 py-2 font-label-default text-label-default border-0 bg-transparent cursor-pointer relative"
            [class]="
              tab() === 'timeline'
                ? 'text-primary-container'
                : 'text-on-surface-variant hover:text-on-surface'
            "
            [attr.aria-selected]="tab() === 'timeline'"
            (click)="setTab('timeline')"
          >
            Línea de tiempo
            @if (tab() === 'timeline') {
              <span
                class="absolute left-0 right-0 bottom-0 h-0.5 bg-primary-container rounded-full"
              ></span>
            }
          </button>
        </div>

        @if (tab() === 'timeline') {
          <app-case-timeline [entries]="timelineDesc()" />
        } @else {
          <app-case-files-toolbar
            [canManage]="auth.canManage()"
            [canUpload]="!!selectedFolderId()"
            [query]="query()"
            (newFolder)="openCreateFolder()"
            (upload)="openUpload()"
            (trash)="openTrash()"
            (queryChange)="query.set($event)"
          />

          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start min-w-0">
            <app-case-folder-tree
              [rows]="folderRows()"
              [selectedId]="selectedFolderId()"
              (select)="selectFolder($event)"
              (menu)="onFolderMenu($event)"
            />
            <app-case-files-table
              [folder]="selectedFolder()"
              [query]="query()"
              [userEmails]="userEmails()"
              (openFolder)="selectFolder($event)"
              (openItem)="openItem($event)"
              (uploadHere)="openUpload()"
              (reassign)="openReassign()"
              (menu)="onItemMenu($event)"
            />
          </div>
        }
      }
    </div>

    @if (folderMenu(); as fm) {
      <app-case-context-menu
        [header]="fm.name"
        [actions]="folderMenuActions(fm)"
        [canManage]="auth.canManage()"
        [top]="fm.y"
        [left]="fm.x"
        (actionSelect)="onFolderAction($event)"
      />
    }

    @if (itemMenu(); as im) {
      <app-case-context-menu
        [header]="itemDisplayName(im.item)"
        [actions]="itemMenuActions(im.item)"
        [canManage]="auth.canManage()"
        [top]="im.y"
        [left]="im.x"
        (actionSelect)="onItemAction($event)"
      />
    }

    @if (nameModal(); as nm) {
      <app-case-name-modal
        [mode]="nm.mode"
        [initialName]="nm.initialName"
        [pathHint]="nm.pathHint"
        [error]="nameModalError()"
        [submitting]="nameModalBusy()"
        (cancel)="nameModal.set(null); nameModalError.set(null)"
        (confirm)="submitNameModal($event)"
      />
    }

    @if (uploadOpen()) {
      <app-case-upload-modal
        [destination]="uploadDestination()"
        [rows]="uploadRows()"
        [busy]="uploadBusy()"
        (filesAdded)="onFilesAdded($event)"
        (retry)="retryUpload($event)"
        (close)="closeUpload()"
      />
    }

    @if (moveModal(); as mm) {
      <app-case-move-modal
        [itemName]="mm.name"
        [folders]="folders()"
        [allowRoot]="mm.kind === 'folder'"
        [disabledIds]="mm.kind === 'folder' ? mm.disabledIds : emptySet"
        [error]="moveModalError()"
        [submitting]="moveModalBusy()"
        (cancel)="moveModal.set(null); moveModalError.set(null)"
        (confirm)="submitMove($event)"
      />
    }

    @if (trashOpen()) {
      <app-case-trash-drawer
        [trash]="trash()"
        [loading]="trashLoading()"
        [error]="trashError()"
        [userEmails]="userEmails()"
        (close)="trashOpen.set(false)"
        (restoreFolder)="restoreFolder($event)"
        (restoreItem)="restoreItem($event)"
      />
    }

    @if (reassignOpen()) {
      <app-assign-case-modal
        title="Mover a otro proceso"
        [subtitle]="reassignSubtitle()"
        [fromExpediente]="true"
        [error]="reassignError()"
        [submitting]="reassignBusy()"
        (cancel)="reassignOpen.set(false); reassignError.set(null)"
        (confirm)="submitReassign($event)"
      />
    }

    @if (viewerItem(); as vi) {
      <app-case-file-viewer
        [item]="vi"
        (close)="viewerItem.set(null)"
        (download)="downloadItem(vi)"
      />
    }
  `,
})
export class CaseDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly unassigned = inject(UnassignedService);

  readonly itemDisplayName = itemDisplayName;
  readonly emptySet = new Set<string>();

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly caso = signal<CaseDetail | null>(null);
  readonly folders = signal<CaseFolder[]>([]);
  readonly selectedFolderId = signal<string | null>(null);
  readonly query = signal('');
  readonly tab = signal<CaseDetailTab>('expediente');
  readonly userEmails = signal<ReadonlyMap<string, string>>(new Map());

  readonly folderMenu = signal<FolderMenuState | null>(null);
  readonly itemMenu = signal<ItemMenuState | null>(null);

  readonly nameModal = signal<NameModalState | null>(null);
  readonly nameModalError = signal<string | null>(null);
  readonly nameModalBusy = signal(false);

  readonly uploadOpen = signal(false);
  readonly uploadRows = signal<UploadRow[]>([]);
  readonly uploadBusy = signal(false);

  readonly moveModal = signal<MoveModalState | null>(null);
  readonly moveModalError = signal<string | null>(null);
  readonly moveModalBusy = signal(false);

  readonly trashOpen = signal(false);
  readonly trash = signal<CaseTrash | null>(null);
  readonly trashLoading = signal(false);
  readonly trashError = signal<string | null>(null);

  readonly reassignOpen = signal(false);
  readonly reassignError = signal<string | null>(null);
  readonly reassignBusy = signal(false);
  readonly viewerItem = signal<CaseFolderItem | null>(null);
  readonly accionante = signal<string | null>(null);

  private caseId = '';

  readonly folderRows = computed(() => flattenFolders(this.folders()));
  readonly selectedFolder = computed(() => {
    const id = this.selectedFolderId();
    if (!id) return null;
    return findFolder(this.folders(), id);
  });
  readonly stats = computed(() => treeStats(this.folders()));

  timelineDesc(): CaseDetail['timeline'] {
    const t = this.caso()?.timeline ?? [];
    return [...t].reverse();
  }

  uploadDestination(): string {
    return this.selectedFolder()?.name ?? 'Expediente';
  }

  reassignSubtitle(): string {
    const correo = this.selectedFolder()?.correo;
    if (!correo) return '';
    return [correo.sender, correo.subject].filter(Boolean).join(' · ');
  }

  folderMenuActions(fm: FolderMenuState) {
    const folder = findFolder(this.folders(), fm.id);
    return FOLDER_MENU_ACTIONS.filter((a) => {
      if (a.id === 'delete' && fm.origen !== 'manual') return false;
      if (a.id === 'new-subfolder' && (folder?.depth ?? 0) >= 5) return false;
      return true;
    });
  }

  itemMenuActions(item: CaseFolderItem) {
    return ITEM_MENU_ACTIONS.filter((a) => {
      if (a.id === 'rename' && item.kind !== 'subido') return false;
      if (a.id === 'delete' && item.kind !== 'subido') return false;
      if (a.id === 'identify' && (item.kind !== 'adjunto' || !item.attachment_id)) return false;
      return true;
    });
  }

  @HostListener('document:click')
  onDocClick(): void {
    this.folderMenu.set(null);
    this.itemMenu.set(null);
  }

  ngOnInit(): void {
    void this.loadUsers();
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((q) => {
      const tab = q.get('tab');
      if (tab === 'timeline' || tab === 'expediente') this.tab.set(tab);
      const folder = q.get('folder');
      if (folder) this.selectedFolderId.set(folder);
    });
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((p) => {
      void this.load(p.get('id') ?? '');
    });
  }

  setTab(tab: CaseDetailTab): void {
    this.tab.set(tab);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  selectFolder(id: string): void {
    this.selectedFolderId.set(id);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { folder: id },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  goBack(): void {
    void this.router.navigateByUrl('/cases');
  }

  reload(): void {
    void this.load(this.caseId);
  }

  onFolderMenu(ev: { id: string; name: string; x: number; y: number }): void {
    this.itemMenu.set(null);
    const folder = findFolder(this.folders(), ev.id);
    this.folderMenu.set({
      ...ev,
      origen: folder?.origen ?? 'manual',
    });
  }

  onItemMenu(ev: { item: CaseFolderItem; x: number; y: number }): void {
    this.folderMenu.set(null);
    this.itemMenu.set(ev);
  }

  onFolderAction(actionId: string): void {
    const fm = this.folderMenu();
    this.folderMenu.set(null);
    if (!fm) return;
    const id = actionId as FolderMenuActionId;
    switch (id) {
      case 'new-subfolder':
        this.nameModal.set({
          mode: 'create-folder',
          parentId: fm.id,
          initialName: '',
          pathHint: `En: ${fm.name}`,
        });
        break;
      case 'rename':
        this.nameModal.set({
          mode: 'rename-folder',
          folderId: fm.id,
          parentId: null,
          initialName: fm.name,
          pathHint: '',
        });
        break;
      case 'upload':
        this.selectedFolderId.set(fm.id);
        this.openUpload();
        break;
      case 'move':
        this.moveModal.set({
          kind: 'folder',
          id: fm.id,
          name: fm.name,
          disabledIds: this.subtreeIds(fm.id),
        });
        break;
      case 'delete':
        void this.deleteFolder(fm.id, fm.name);
        break;
    }
  }

  onItemAction(actionId: string): void {
    const im = this.itemMenu();
    this.itemMenu.set(null);
    if (!im) return;
    const id = actionId as ItemMenuActionId;
    switch (id) {
      case 'open':
        void this.openItem(im.item);
        break;
      case 'download':
        void this.downloadItem(im.item);
        break;
      case 'identify':
        if (im.item.attachment_id) {
          void this.router.navigate(['/documents', im.item.attachment_id]);
        }
        break;
      case 'rename':
        this.nameModal.set({
          mode: 'rename-item',
          itemId: im.item.id,
          parentId: null,
          initialName: im.item.filename ?? '',
          pathHint: '',
        });
        break;
      case 'move':
        this.moveModal.set({
          kind: 'item',
          id: im.item.id,
          name: itemDisplayName(im.item),
        });
        break;
      case 'delete':
        void this.deleteItem(im.item);
        break;
    }
  }

  openReassign(): void {
    if (!this.selectedFolder()?.correo) return;
    this.reassignError.set(null);
    this.reassignOpen.set(true);
  }

  async submitReassign(target: { case_id: string } | { radicado: string }): Promise<void> {
    const messageId = this.selectedFolder()?.correo?.message_id;
    if (!messageId) return;
    this.reassignBusy.set(true);
    this.reassignError.set(null);
    try {
      const link = await caseFilesApi.assign(messageId, target);
      this.reassignOpen.set(false);
      void this.unassigned.refresh();
      this.toast.push({
        type: 'success',
        title: 'Correo asignado al proceso',
        description: link.radicado ? formatRadicado(link.radicado) : '',
      });
      if (link.case_id && link.case_id !== this.caseId) {
        void this.router.navigate(['/cases', link.case_id]);
        return;
      }
      await this.reloadFiles();
    } catch (e) {
      this.reassignError.set(this.mapError(e));
    } finally {
      this.reassignBusy.set(false);
    }
  }

  openCreateFolder(): void {
    const selected = this.selectedFolder();
    this.nameModal.set({
      mode: 'create-folder',
      parentId: selected?.id ?? null,
      initialName: '',
      pathHint: selected ? `En: ${selected.name}` : 'En: Raíz del expediente',
    });
  }

  openUpload(): void {
    if (!this.selectedFolderId()) {
      this.toast.push({
        type: 'warn',
        title: 'Selecciona una carpeta',
        description: 'Elige una carpeta del directorio antes de subir archivos.',
      });
      return;
    }
    this.uploadRows.set([]);
    this.uploadOpen.set(true);
  }

  closeUpload(): void {
    if (this.uploadBusy()) return;
    this.uploadOpen.set(false);
  }

  async openTrash(): Promise<void> {
    this.trashOpen.set(true);
    this.trashLoading.set(true);
    this.trashError.set(null);
    try {
      this.trash.set(await caseFilesApi.trash(this.caseId));
    } catch (e) {
      this.trashError.set(this.mapError(e));
    } finally {
      this.trashLoading.set(false);
    }
  }

  async submitNameModal(name: string): Promise<void> {
    const modal = this.nameModal();
    if (!modal) return;
    this.nameModalBusy.set(true);
    this.nameModalError.set(null);
    try {
      if (modal.mode === 'create-folder') {
        const created = await caseFilesApi.createFolder(
          this.caseId,
          name,
          modal.parentId,
        );
        this.toast.show('Carpeta creada');
        await this.reloadFiles(created.id);
      } else if (modal.mode === 'rename-folder' && modal.folderId) {
        await caseFilesApi.patchFolder(modal.folderId, { name });
        this.toast.show('Cambios guardados');
        await this.reloadFiles();
      } else if (modal.mode === 'rename-item' && modal.itemId) {
        await caseFilesApi.patchItem(modal.itemId, { name });
        this.toast.show('Cambios guardados');
        await this.reloadFiles();
      }
      this.nameModal.set(null);
    } catch (e) {
      this.nameModalError.set(this.mapError(e));
    } finally {
      this.nameModalBusy.set(false);
    }
  }

  async submitMove(targetFolderId: string | null): Promise<void> {
    const modal = this.moveModal();
    if (!modal) return;
    this.moveModalBusy.set(true);
    this.moveModalError.set(null);
    try {
      if (modal.kind === 'folder') {
        await caseFilesApi.patchFolder(modal.id, { parent_id: targetFolderId });
      } else {
        if (!targetFolderId) {
          this.moveModalError.set('Los documentos siempre van dentro de una carpeta');
          return;
        }
        await caseFilesApi.patchItem(modal.id, { folder_id: targetFolderId });
      }
      this.toast.show('Movido');
      this.moveModal.set(null);
      await this.reloadFiles(modal.kind === 'item' ? targetFolderId : undefined);
    } catch (e) {
      this.moveModalError.set(this.mapError(e));
    } finally {
      this.moveModalBusy.set(false);
    }
  }

  onFilesAdded(files: File[]): void {
    const rows: UploadRow[] = files.map((file) => {
      const err = CaseUploadModal.validateFile(file);
      return {
        id: crypto.randomUUID(),
        file,
        status: err ? 'error' : 'pending',
        error: err ?? undefined,
      };
    });
    this.uploadRows.update((current) => [...current, ...rows]);
    void this.processUploadQueue();
  }

  retryUpload(id: string): void {
    this.uploadRows.update((rows) =>
      rows.map((r) =>
        r.id === id
          ? {
              ...r,
              status: CaseUploadModal.validateFile(r.file) ? 'error' : 'pending',
              error: CaseUploadModal.validateFile(r.file) ?? undefined,
            }
          : r,
      ),
    );
    void this.processUploadQueue();
  }

  openItem(item: CaseFolderItem): void {
    this.viewerItem.set(item);
  }

  async downloadItem(item: CaseFolderItem): Promise<void> {
    try {
      const blob = await caseFilesApi.content(item.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download =
        item.filename || (item.kind === 'cuerpo' ? 'cuerpo-del-correo.txt' : 'archivo');
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      this.toast.push({
        type: 'error',
        title: 'No se pudo descargar',
        description: this.mapError(e),
      });
      if (e instanceof ApiError && e.status === 404) await this.reloadFiles();
    }
  }

  async restoreFolder(id: string): Promise<void> {
    try {
      await caseFilesApi.restoreFolder(id);
      this.toast.show('Restaurado');
      await this.openTrash();
      await this.reloadFiles();
    } catch (e) {
      this.toast.push({ type: 'error', title: 'No se pudo restaurar', description: this.mapError(e) });
    }
  }

  async restoreItem(id: string): Promise<void> {
    try {
      await caseFilesApi.restoreItem(id);
      this.toast.show('Restaurado');
      await this.openTrash();
      await this.reloadFiles();
    } catch (e) {
      this.toast.push({ type: 'error', title: 'No se pudo restaurar', description: this.mapError(e) });
    }
  }

  private async deleteFolder(id: string, name: string): Promise<void> {
    if (!confirm(`Se moverá «${name}» a la papelera con todo su contenido.`)) return;
    try {
      await caseFilesApi.deleteFolder(id);
      this.toast.show('Movido a la papelera');
      if (this.selectedFolderId() === id) this.selectedFolderId.set(null);
      await this.reloadFiles();
    } catch (e) {
      this.toast.push({ type: 'error', title: 'No se pudo eliminar', description: this.mapError(e) });
    }
  }

  private async deleteItem(item: CaseFolderItem): Promise<void> {
    if (!confirm('Se moverá a la papelera. Un administrador puede restaurarlo.')) return;
    try {
      await caseFilesApi.deleteItem(item.id);
      this.toast.show('Movido a la papelera');
      await this.reloadFiles();
    } catch (e) {
      this.toast.push({ type: 'error', title: 'No se pudo eliminar', description: this.mapError(e) });
    }
  }

  private async processUploadQueue(): Promise<void> {
    const folderId = this.selectedFolderId();
    if (!folderId || this.uploadBusy()) return;
    this.uploadBusy.set(true);
    let uploaded = 0;
    try {
      for (;;) {
        const next = this.uploadRows().find((r) => r.status === 'pending');
        if (!next) break;
        this.uploadRows.update((rows) =>
          rows.map((r) => (r.id === next.id ? { ...r, status: 'uploading' } : r)),
        );
        try {
          await caseFilesApi.upload(folderId, next.file);
          uploaded += 1;
          this.uploadRows.update((rows) =>
            rows.map((r) => (r.id === next.id ? { ...r, status: 'done' } : r)),
          );
        } catch (e) {
          this.uploadRows.update((rows) =>
            rows.map((r) =>
              r.id === next.id
                ? { ...r, status: 'error', error: this.mapError(e) }
                : r,
            ),
          );
        }
      }
      if (uploaded > 0) {
        this.toast.show(uploaded === 1 ? 'Archivo subido' : `${uploaded} archivos subidos`);
        await this.reloadFiles();
      }
    } finally {
      this.uploadBusy.set(false);
    }
  }

  private subtreeIds(folderId: string): Set<string> {
    const moving = findFolder(this.folders(), folderId);
    const ids = new Set<string>();
    if (!moving) {
      ids.add(folderId);
      return ids;
    }
    // Deshabilitar destinos inválidos (ciclo / profundidad).
    const mark = (list: CaseFolder[]) => {
      for (const f of list) {
        if (!canMoveFolderInto(moving, f)) ids.add(f.id);
        mark(f.children);
      }
    };
    mark(this.folders());
    return ids;
  }

  private async loadUsers(): Promise<void> {
    try {
      const users = await authApi.users();
      this.userEmails.set(new Map(users.map((u) => [u.id, u.email])));
    } catch {
      // opcional: sin emails se muestra el UUID corto
    }
  }

  private async load(id: string): Promise<void> {
    if (!id) {
      this.error.set('Proceso no encontrado');
      this.loading.set(false);
      return;
    }
    this.caseId = id;
    this.loading.set(true);
    this.error.set(null);
    this.accionante.set(null);
    try {
      const [detail, files] = await Promise.all([
        casesApi.get(id),
        caseFilesApi.tree(id),
      ]);
      this.caso.set(detail);
      this.folders.set(files.folders);
      const fromUrl = this.route.snapshot.queryParamMap.get('folder');
      const preferred = fromUrl && findFolder(files.folders, fromUrl) ? fromUrl : null;
      if (preferred) {
        this.selectedFolderId.set(preferred);
      } else if (!this.selectedFolderId() || !findFolder(files.folders, this.selectedFolderId()!)) {
        this.selectedFolderId.set(files.folders[0]?.id ?? null);
      }
      void this.loadAccionante(detail.radicado);
    } catch (e) {
      this.caso.set(null);
      this.folders.set([]);
      this.error.set(
        e instanceof ApiError && e.status === 404
          ? 'Proceso no encontrado'
          : this.mapError(e),
      );
    } finally {
      this.loading.set(false);
    }
  }

  private async loadAccionante(radicado: string): Promise<void> {
    try {
      const page = await documentsApi.list(
        { radicado, document_status: 'extracted' },
        null,
        1,
      );
      const partes = page.items[0]?.fields?.partes ?? [];
      const acc = partes.find((p) => p.rol === 'accionante');
      this.accionante.set(acc?.nombre?.trim() || null);
    } catch {
      this.accionante.set(null);
    }
  }

  private async reloadFiles(selectId?: string | null): Promise<void> {
    try {
      const files = await caseFilesApi.tree(this.caseId);
      this.folders.set(files.folders);
      if (selectId) this.selectedFolderId.set(selectId);
    } catch (e) {
      this.toast.push({
        type: 'error',
        title: 'No se pudo actualizar el expediente',
        description: this.mapError(e),
      });
    }
  }

  private mapError(e: unknown): string {
    if (e instanceof ApiError) {
      if (e.status === 429) return 'Demasiadas solicitudes, espera un momento';
      return errorText(e.code);
    }
    return errorText(null);
  }
}
