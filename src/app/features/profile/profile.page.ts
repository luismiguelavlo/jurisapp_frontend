import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { ApiError } from '../../core/api/client';
import { errorText } from '../../core/api/errors';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ROLE_LABEL, type UserRole } from '../users/models/users.models';
import {
  ChangePasswordForm,
  type ChangePasswordError,
} from './components/change-password-form/change-password-form';
import { ProfileNameForm, type ProfileName } from './components/profile-name-form/profile-name-form';
import { ProfileSection } from './components/profile-section/profile-section';

@Component({
  selector: 'app-profile-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProfileSection, ProfileNameForm, ChangePasswordForm],
  template: `
    <div class="w-full max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-10">
      <header class="flex flex-col gap-1">
        <h1 class="m-0 text-headline-lg text-on-surface">Mi perfil</h1>
        <p class="m-0 text-body-default text-on-surface-variant">
          {{ roleLabel[role()] }} en {{ tenant() }}.
        </p>
      </header>

      <app-profile-section
        id="sec-name"
        title="Tu nombre"
        description="Así te ven tus compañeros en las revisiones, carpetas y asignaciones. Es el mismo en todas las organizaciones donde estés."
      >
        <app-profile-name-form
          [firstName]="name().first_name"
          [lastName]="name().last_name"
          [email]="email()"
          [jobTitle]="jobTitle()"
          [busy]="savingName()"
          [saved]="nameSaved()"
          (submitted)="saveName($event)"
        />
      </app-profile-section>

      <app-profile-section
        id="sec-pwd"
        title="Contraseña"
        description="Elige una que no uses en otros sitios. Sirve para todas las organizaciones de tu cuenta."
      >
        <app-change-password-form
          [email]="email()"
          [error]="pwdError()"
          [busy]="savingPwd()"
          (submitted)="changePassword($event)"
        />
      </app-profile-section>
    </div>
  `,
})
export class ProfilePage {
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly pwdForm = viewChild.required(ChangePasswordForm);

  readonly roleLabel = ROLE_LABEL;
  readonly email = this.auth.userEmail;
  readonly role = computed<UserRole>(() => this.auth.role() ?? 'member');
  readonly tenant = this.auth.tenantName;
  readonly jobTitle = computed(() => this.auth.me()?.job_title ?? null);
  readonly name = computed<ProfileName>(() => ({
    first_name: this.auth.me()?.first_name ?? '',
    last_name: this.auth.me()?.last_name ?? '',
  }));

  readonly savingName = signal(false);
  readonly nameSaved = signal(false);
  readonly savingPwd = signal(false);
  readonly pwdError = signal<ChangePasswordError>(null);

  async saveName(n: ProfileName): Promise<void> {
    this.savingName.set(true);
    this.nameSaved.set(false);
    try {
      await this.auth.updateName(n.first_name, n.last_name);
      this.nameSaved.set(true);
    } catch (e) {
      this.toast.push({
        type: 'error',
        title: 'No se guardó el nombre',
        description: e instanceof ApiError ? errorText(e.code) : 'Revisa tu conexión.',
      });
    } finally {
      this.savingName.set(false);
    }
  }

  async changePassword(p: { current_password: string; new_password: string }): Promise<void> {
    this.pwdError.set(null);
    this.savingPwd.set(true);
    try {
      await this.auth.changePassword(p.new_password, p.current_password);
      this.pwdForm().reset();
      this.toast.push({
        type: 'success',
        title: 'Contraseña cambiada',
        description: 'Se cerraron tus sesiones en los demás dispositivos.',
      });
    } catch (e) {
      if (e instanceof ApiError) {
        // 400 invalid_credentials (no 401, para no disparar el logout).
        if (e.code === 'invalid_credentials' || e.code === 'weak_password' || e.code === 'password_reused') {
          this.pwdError.set(e.code);
        } else if (e.status === 429) {
          this.pwdError.set('rate_limited');
        } else {
          this.toast.push({ type: 'error', title: 'No se cambió la contraseña', description: errorText(e.code) });
        }
      } else {
        this.toast.push({ type: 'error', title: 'Sin conexión', description: 'Revisa tu conexión e intenta de nuevo.' });
      }
    } finally {
      this.savingPwd.set(false);
    }
  }
}
