import { ChangeDetectionStrategy, Component, OnInit, computed, effect, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { AlertBanner } from '../../../../shared/components/alert-banner/alert-banner';
import { DialogShell } from '../../../../shared/components/dialog-shell/dialog-shell';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';
import { BTN, INPUT_CLASS } from '../../../../shared/ui/ui-classes';
import {
  displayName,
  grantableRoles,
  type MemberPatch,
  type TenantMember,
  type UserRole,
} from '../../models/users.models';
import { RolePicker } from '../role-picker/role-picker';

@Component({
  selector: 'app-edit-user-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogShell, ReactiveFormsModule, RolePicker, MaterialIcon, AlertBanner],
  template: `
    <app-dialog-shell [title]="'Editar a ' + name()" [description]="user().email" (closed)="closed.emit()">
      <form id="edit-user-form" class="flex flex-col gap-4" [formGroup]="form" (ngSubmit)="submit()">
        @if (lockedAccount()) {
          <p class="m-0 flex items-start gap-2 px-3 py-2.5 rounded-[6px] bg-surface-container-low text-caption text-on-surface-variant leading-5">
            <app-material-icon name="lock" [size]="15" className="mt-0.5 shrink-0" />
            <span>
              Esta cuenta también pertenece a otra organización, así que su nombre solo lo puede cambiar
              la persona desde Mi perfil. El cargo y el rol sí son de esta entidad.
            </span>
          </p>
        }

        @if (error()) {
          <app-alert-banner variant="error">{{ error() }}</app-alert-banner>
        }

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-label-compact text-on-surface mb-1" for="ed-first">Nombre</label>
            <input id="ed-first" type="text" maxlength="100" formControlName="first_name" [class]="inputClass" />
          </div>
          <div>
            <label class="block text-label-compact text-on-surface mb-1" for="ed-last">Apellido</label>
            <input id="ed-last" type="text" maxlength="100" formControlName="last_name" [class]="inputClass" />
          </div>
        </div>

        <div>
          <label class="block text-label-compact text-on-surface mb-1" for="ed-job">Cargo en la entidad</label>
          <input id="ed-job" type="text" maxlength="120" formControlName="job_title" placeholder="Sin cargo" [class]="inputClass" />
          <p class="m-0 mt-1 text-caption text-on-surface-variant">Déjalo vacío para quitar el cargo.</p>
        </div>

        <app-role-picker
          name="ed-role"
          [roles]="roles()"
          [value]="role()"
          [note]="role() !== user().role ? 'Al cambiar el rol se cierran sus sesiones abiertas: tendrá que volver a entrar.' : null"
          (valueChange)="role.set($event)"
        />

        <label class="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            class="mt-0.5 accent-primary"
            [checked]="receives()"
            [disabled]="user().status !== 'active'"
            (change)="receives.set($any($event.target).checked)"
          />
          <span class="flex flex-col gap-0.5">
            <span class="text-label-compact text-on-surface">Asignarle automáticamente los correos que lleguen</span>
            <span class="text-caption text-on-surface-variant">
              Los correos nuevos se reparten entre los marcados, a quien tenga menos pendientes. Desmarcarlo no le
              quita los que ya tiene.
            </span>
          </span>
        </label>
      </form>

      <ng-container dialog-actions>
        <button type="button" [class]="btn.quiet" (click)="closed.emit()">Cancelar</button>
        <button type="submit" form="edit-user-form" [class]="btn.primary" [disabled]="!dirty() || saving()">
          {{ saving() ? 'Guardando…' : 'Guardar cambios' }}
        </button>
      </ng-container>
    </app-dialog-shell>
  `,
})
export class EditUserDialog implements OnInit {
  readonly user = input.required<TenantMember>();
  readonly myRole = input<UserRole | null>(null);
  /** 409 user_in_other_tenants: nombre bloqueado. */
  readonly lockedAccount = input(false);
  readonly error = input<string | null>(null);
  readonly saving = input(false);
  readonly closed = output<void>();
  readonly saved = output<MemberPatch>();

  readonly btn = BTN;
  readonly inputClass = INPUT_CLASS;
  readonly role = signal<UserRole>('member');
  readonly receives = signal(false);
  readonly name = computed(() => displayName(this.user()));
  readonly roles = computed(() => grantableRoles(this.myRole()));

  readonly form = new FormGroup({
    first_name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    last_name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    job_title: new FormControl('', { nonNullable: true }),
  });
  private readonly values = toSignal(this.form.valueChanges);

  readonly dirty = computed(() => {
    this.values();
    this.role();
    this.receives();
    return Object.keys(this.patch()).length > 0;
  });

  ngOnInit(): void {
    const u = this.user();
    this.role.set(u.role);
    this.receives.set(u.receives_assignments);
    this.form.setValue({
      first_name: u.first_name ?? '',
      last_name: u.last_name ?? '',
      job_title: u.job_title ?? '',
    });
  }

  constructor() {
    // Se activa al iniciar o cuando el PATCH responde 409 user_in_other_tenants.
    effect(() => {
      if (!this.lockedAccount()) return;
      const u = this.user();
      this.form.controls.first_name.setValue(u.first_name ?? '');
      this.form.controls.last_name.setValue(u.last_name ?? '');
      this.form.controls.first_name.disable();
      this.form.controls.last_name.disable();
    });
  }

  /** Solo lo que cambió, como pide el PATCH. */
  patch(): MemberPatch {
    const u = this.user();
    const v = this.form.getRawValue();
    const p: MemberPatch = {};
    if (!this.lockedAccount()) {
      if (v.first_name.trim() !== (u.first_name ?? '')) p.first_name = v.first_name.trim();
      if (v.last_name.trim() !== (u.last_name ?? '')) p.last_name = v.last_name.trim();
    }
    if (v.job_title.trim() !== (u.job_title ?? '')) p.job_title = v.job_title.trim() || null;
    if (this.role() !== u.role) p.role = this.role();
    if (this.receives() !== u.receives_assignments) p.receives_assignments = this.receives();
    return p;
  }

  submit(): void {
    if (this.form.invalid || !this.dirty()) return;
    this.saved.emit(this.patch());
  }
}
