import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { formatBogotaDateTime } from '../../../../core/utils/date-format';
import { DialogShell } from '../../../../shared/components/dialog-shell/dialog-shell';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';
import { OneTimeSecret } from '../../../../shared/components/one-time-secret/one-time-secret';
import { BTN } from '../../../../shared/ui/ui-classes';
import { expiryLabel } from '../../models/users.models';

export type Credential =
  | { kind: 'password'; name: string; value: string; expiresAt: string }
  | { kind: 'invitation'; name: string; email: string; value: string; expiresAt: string; emailSent: boolean; resent: boolean };

/**
 * Lo que se entrega tras invitar o restablecer: si el correo salió, basta confirmarlo;
 * si no, o si es una contraseña temporal, se muestra el talón de un solo uso.
 */
@Component({
  selector: 'app-credential-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogShell, OneTimeSecret, MaterialIcon],
  template: `
    @let c = credential();
    <app-dialog-shell [title]="title()" [description]="description()" [dismissible]="!mustCopy() || copied()" (closed)="closed.emit()">
      <div class="flex flex-col gap-4">
        @if (c.kind === 'invitation' && c.emailSent) {
          <p class="m-0 flex items-start gap-2.5 text-body-default text-on-surface">
            <app-material-icon name="mark_email_read" [size]="20" className="text-[#2f7049] shrink-0 mt-px" />
            <span>
              El correo va camino a <strong class="font-medium">{{ c.email }}</strong>. Si no le llega, copia el enlace y
              compártelo por otro medio.
            </span>
          </p>
          <details class="group">
            <summary class="text-label-compact text-primary cursor-pointer list-none inline-flex items-center gap-1 select-none">
              <app-material-icon name="chevron_right" [size]="16" className="transition-transform group-open:rotate-90" />
              Ver el enlace
            </summary>
            <div class="mt-3">
              <app-one-time-secret kind="link" label="Enlace de invitación" [value]="c.value" [expiresLabel]="expires()" footnote="Sirve para una sola persona y una sola vez." copyLabel="Copiar enlace" />
            </div>
          </details>
        } @else if (c.kind === 'invitation') {
          <app-one-time-secret
            kind="link"
            label="Enlace de invitación"
            [value]="c.value"
            [expiresLabel]="expires()"
            footnote="Sirve para una sola persona y una sola vez."
            copyLabel="Copiar enlace"
            (copiedChange)="copied.set(true)"
          />
        } @else {
          <app-one-time-secret
            [value]="c.value"
            [expiresLabel]="expires()"
            footnote="No se volverá a mostrar. Sirve para un solo inicio de sesión."
            (copiedChange)="copied.set(true)"
          />
          <ul class="m-0 pl-5 flex flex-col gap-1 text-body-compact text-on-surface-variant">
            <li>Al entrar con ella, el sistema le pedirá crear una contraseña propia.</li>
            <li>Sus sesiones abiertas ya se cerraron en todos los dispositivos.</li>
            <li>Si no la usa a tiempo, tendrás que generar otra.</li>
          </ul>
        }
      </div>

      <ng-container dialog-actions>
        @if (mustCopy() && !copied()) {
          <span class="self-center mr-auto text-caption text-on-surface-variant">Cópiala antes de cerrar</span>
        }
        <button type="button" [class]="btn.outline" [disabled]="mustCopy() && !copied()" (click)="closed.emit()">
          Listo
        </button>
      </ng-container>
    </app-dialog-shell>
  `,
})
export class CredentialDialog {
  readonly credential = input.required<Credential>();
  readonly closed = output<void>();

  readonly btn = BTN;
  readonly copied = signal(false);

  /** Sin correo enviado, cerrar sin copiar significa perder el secreto. */
  readonly mustCopy = computed(() => {
    const c = this.credential();
    return c.kind === 'password' || !c.emailSent;
  });

  readonly expires = computed(
    () => `${expiryLabel(this.credential().expiresAt)} (${formatBogotaDateTime(this.credential().expiresAt)})`,
  );

  readonly title = computed(() => {
    const c = this.credential();
    if (c.kind === 'password') return `Contraseña temporal para ${c.name}`;
    if (!c.emailSent) return 'Comparte el enlace de invitación';
    return c.resent ? 'Invitación reenviada' : 'Invitación enviada';
  });

  readonly description = computed(() => {
    const c = this.credential();
    if (c.kind === 'password') return 'Entrégasela por un canal privado: en persona, por teléfono o por mensaje directo.';
    if (!c.emailSent) return `No pudimos enviar el correo a ${c.email}. Copia el enlace y envíaselo tú.`;
    return c.resent ? 'El enlace anterior ya no funciona.' : null;
  });
}
