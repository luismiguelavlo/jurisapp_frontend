import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AlertBanner } from '../../../../shared/components/alert-banner/alert-banner';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';
import { PasswordField } from '../../../../shared/components/password-field/password-field';
import {
  IMAP_ERROR_MESSAGES,
  IMAP_ERROR_OPTIONS,
  type ImapErrorCode,
} from '../../models/connect-mailbox.models';

@Component({
  selector: 'app-imap-config-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, AlertBanner, MaterialIcon, PasswordField],
  template: `
    <div class="flex flex-col gap-space-md">
      <div
        class="bg-surface-container-low p-2.5 rounded-[6px] flex items-center justify-between gap-space-sm"
      >
        <div class="flex items-center gap-space-xs shrink-0">
          <app-material-icon name="bug_report" [size]="15" className="text-on-surface-variant" />
          <span class="text-caption font-medium text-on-surface-variant">Simulador de fallos:</span>
        </div>
        <select
          class="h-7 px-2 bg-surface-container-lowest text-on-surface text-caption rounded-[4px] outline-none cursor-pointer"
          [value]="errorCode()"
          (change)="onErrorChange($event)"
        >
          @for (option of errorOptions; track option.value) {
            <option [value]="option.value">{{ option.label }}</option>
          }
        </select>
      </div>

      @if (activeError(); as error) {
        <app-alert-banner variant="surface-error" [title]="error.title">
          {{ error.description }}
        </app-alert-banner>
      }

      <div class="flex flex-col gap-space-sm" [formGroup]="form">
        <div class="flex flex-col gap-1">
          <label class="text-label-compact text-on-surface font-medium" for="imap-email"
            >Dirección del buzón clínico</label
          >
          <input
            id="imap-email"
            type="email"
            formControlName="email"
            placeholder="recepcion@clinicasanrafael.com"
            class="h-9 px-3 rounded-[6px] bg-surface-container-lowest text-on-surface text-body-default outline-none transition-all placeholder:text-outline focus:bg-surface-container-low"
          />
        </div>

        <div class="grid grid-cols-3 gap-space-sm">
          <div class="col-span-2 flex flex-col gap-1">
            <label class="text-label-compact text-on-surface font-medium" for="imap-server"
              >Servidor IMAP</label
            >
            <input
              id="imap-server"
              type="text"
              formControlName="server"
              placeholder="imap.clinicasanrafael.com"
              class="h-9 px-3 rounded-[6px] bg-surface-container-lowest text-on-surface text-body-default outline-none transition-all placeholder:text-outline focus:bg-surface-container-low"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-label-compact text-on-surface font-medium" for="imap-port"
              >Puerto</label
            >
            <input
              id="imap-port"
              type="text"
              formControlName="port"
              readonly
              class="h-9 px-3 rounded-[6px] bg-surface-container-low text-on-surface-variant text-body-default outline-none cursor-not-allowed"
            />
            <span class="text-[11px] text-on-surface-variant leading-none mt-0.5"
              >Solo TLS (993)</span
            >
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-label-compact text-on-surface font-medium" for="imap-user"
            >Usuario de autenticación</label
          >
          <input
            id="imap-user"
            type="text"
            formControlName="username"
            placeholder="recepcion@clinicasanrafael.com"
            class="h-9 px-3 rounded-[6px] bg-surface-container-lowest text-on-surface text-body-default outline-none transition-all placeholder:text-outline focus:bg-surface-container-low"
          />
        </div>

        <div class="flex flex-col gap-1">
          <div class="flex items-center justify-between">
            <label class="text-label-compact text-on-surface font-medium" for="imap-pass"
              >Contraseña de aplicación</label
            >
            <span class="text-[11px] text-on-surface-variant">No uses tu clave personal</span>
          </div>
          <app-password-field
            inputId="imap-pass"
            name="imap-pass"
            autocomplete="new-password"
            variant="surface"
            formControlName="password"
          />
          <span class="text-[11px] text-on-surface-variant"
            >Genera un token específico para JurisApp desde la consola de tu correo.</span
          >
        </div>
      </div>
    </div>
  `,
})
export class ImapConfigForm {
  readonly errorCode = input<ImapErrorCode>('none');
  readonly errorCodeChange = output<ImapErrorCode>();

  readonly errorOptions = IMAP_ERROR_OPTIONS;

  readonly form = new FormGroup({
    email: new FormControl('recepcion@clinicasanrafael.com', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    server: new FormControl('imap.clinicasanrafael.com', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    port: new FormControl({ value: '993', disabled: true }, { nonNullable: true }),
    username: new FormControl('recepcion@clinicasanrafael.com', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    password: new FormControl('appl-x934-km09-salud', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  readonly activeError = computed(() => {
    const code = this.errorCode();
    if (code === 'none') {
      return null;
    }
    return IMAP_ERROR_MESSAGES[code];
  });

  onErrorChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as ImapErrorCode;
    this.errorCodeChange.emit(value);
  }

  getRawValue() {
    return {
      ...this.form.getRawValue(),
      port: '993',
    };
  }
}
