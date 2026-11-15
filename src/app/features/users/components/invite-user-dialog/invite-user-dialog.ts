import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { AlertBanner } from '../../../../shared/components/alert-banner/alert-banner';
import { DialogShell } from '../../../../shared/components/dialog-shell/dialog-shell';
import { BTN, INPUT_CLASS } from '../../../../shared/ui/ui-classes';
import { grantableRoles, type InviteDraft, type UserRole } from '../../models/users.models';
import { RolePicker } from '../role-picker/role-picker';

export type InviteError = 'user_already_member' | 'invitation_already_pending' | 'role_not_allowed' | 'invalid' | null;

@Component({
  selector: 'app-invite-user-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogShell, ReactiveFormsModule, RolePicker, AlertBanner],
  template: `
    <app-dialog-shell
      [title]="initial() ? 'Volver a invitar' : 'Invitar usuario'"
      description="Le llegará un correo con un enlace para crear su contraseña. El enlace sirve una sola vez y vence en 72 horas."
      (closed)="closed.emit()"
    >
      <form id="invite-form" class="flex flex-col gap-4" [formGroup]="form" (ngSubmit)="submit()">
        @if (error() === 'user_already_member') {
          <app-alert-banner variant="info">Esa persona ya es usuaria de la entidad. Búscala en la lista para editarla.</app-alert-banner>
        } @else if (error() === 'invitation_already_pending') {
          <app-alert-banner variant="warning" title="Ya tiene una invitación sin aceptar">
            Puedes reenviarla: el enlace anterior dejará de funcionar.
            <button type="button" class="ml-1 p-0 bg-transparent border-0 text-label-compact underline cursor-pointer text-inherit" (click)="resendExisting.emit()">
              Reenviar invitación
            </button>
          </app-alert-banner>
        } @else if (error() === 'role_not_allowed') {
          <app-alert-banner variant="error">No tienes permiso para conceder ese rol.</app-alert-banner>
        } @else if (error() === 'invalid') {
          <app-alert-banner variant="error">Revisa el correo, el nombre y el apellido: algún valor no es válido.</app-alert-banner>
        }

        <div>
          <label class="block text-label-compact text-on-surface mb-1" for="inv-email">Correo</label>
          <input id="inv-email" type="email" maxlength="320" autocomplete="off" formControlName="email" placeholder="nombre@entidad.co" [class]="inputClass" [readonly]="!!initial()" />
          @if (showErr('email')) {
            <p class="m-0 mt-1 text-caption text-error">Escribe un correo válido.</p>
          }
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-label-compact text-on-surface mb-1" for="inv-first">Nombre</label>
            <input id="inv-first" type="text" maxlength="100" autocomplete="off" formControlName="first_name" [class]="inputClass" />
            @if (showErr('first_name')) {
              <p class="m-0 mt-1 text-caption text-error">Escribe el nombre.</p>
            }
          </div>
          <div>
            <label class="block text-label-compact text-on-surface mb-1" for="inv-last">Apellido</label>
            <input id="inv-last" type="text" maxlength="100" autocomplete="off" formControlName="last_name" [class]="inputClass" />
            @if (showErr('last_name')) {
              <p class="m-0 mt-1 text-caption text-error">Escribe el apellido.</p>
            }
          </div>
        </div>

        <div>
          <label class="block text-label-compact text-on-surface mb-1" for="inv-job">
            Cargo <span class="text-on-surface-variant font-normal">(opcional)</span>
          </label>
          <input id="inv-job" type="text" maxlength="120" autocomplete="off" formControlName="job_title" placeholder="Abogada de tutelas" [class]="inputClass" />
        </div>

        <app-role-picker name="inv-role" [roles]="roles()" [value]="role()" (valueChange)="role.set($event)" />
      </form>

      <ng-container dialog-actions>
        <button type="button" [class]="btn.quiet" (click)="closed.emit()">Cancelar</button>
        <button type="submit" form="invite-form" [class]="btn.primary" [disabled]="sending()">
          {{ sending() ? 'Enviando…' : 'Enviar invitación' }}
        </button>
      </ng-container>
    </app-dialog-shell>
  `,
})
export class InviteUserDialog {
  readonly myRole = input<UserRole | null>(null);
  readonly initial = input<Partial<InviteDraft> | null>(null);
  readonly error = input<InviteError>(null);
  readonly sending = input(false);
  readonly closed = output<void>();
  readonly submitted = output<InviteDraft>();
  readonly resendExisting = output<void>();

  readonly btn = BTN;
  readonly inputClass = INPUT_CLASS;
  readonly roles = computed(() => grantableRoles(this.myRole()));
  readonly role = signal<UserRole>('member');
  readonly attempted = signal(false);

  readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    first_name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    last_name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    job_title: new FormControl('', { nonNullable: true }),
  });
  private readonly status = toSignal(this.form.statusChanges, { initialValue: this.form.status });

  ngOnInit(): void {
    const i = this.initial();
    if (i) {
      this.form.patchValue({
        email: i.email ?? '',
        first_name: i.first_name ?? '',
        last_name: i.last_name ?? '',
        job_title: i.job_title ?? '',
      });
      if (i.role) this.role.set(i.role);
    }
  }

  showErr(name: keyof typeof this.form.controls): boolean {
    this.status();
    const c = this.form.controls[name];
    return c.invalid && (c.touched || this.attempted());
  }

  submit(): void {
    this.attempted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.submitted.emit({
      email: v.email.trim(),
      first_name: v.first_name.trim(),
      last_name: v.last_name.trim(),
      job_title: v.job_title.trim() || null,
      role: this.role(),
    });
  }
}
