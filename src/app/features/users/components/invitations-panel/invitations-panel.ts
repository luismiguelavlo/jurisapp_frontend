import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { formatRelativeTime } from '../../../../core/api/labels';
import { formatBogotaDateTime } from '../../../../core/utils/date-format';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';
import { ROLE_LABEL, expiresSoon, expiryLabel, type Invitation } from '../../models/users.models';
import { UserIdentity } from '../user-identity/user-identity';

/** Invitaciones pendientes y vencidas: aún no son usuarios, así que van aparte de la tabla. */
@Component({
  selector: 'app-invitations-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon, UserIdentity],
  template: `
    <section class="flex flex-col gap-2" aria-labelledby="inv-title">
      <div class="flex items-baseline justify-between gap-3">
        <h2 id="inv-title" class="m-0 text-headline-sm text-on-surface">Invitaciones sin aceptar</h2>
        <span class="text-caption text-on-surface-variant">El enlace vence a las 72 horas de enviado</span>
      </div>

      <ul class="m-0 p-0 list-none bg-surface-container-lowest rounded-xl shadow-sm">
        @for (inv of invitations(); track inv.id) {
          @let expired = inv.status === 'expired';
          <li
            class="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 px-6 py-3.5 border-b border-outline-variant/40 last:border-b-0"
          >
            <app-user-identity class="sm:flex-1" [person]="inv" [muted]="expired" />

            <div class="flex flex-col sm:w-44 shrink-0">
              <span class="text-body-compact text-on-surface">{{ roleLabel[inv.role] }}</span>
              <span class="text-caption text-on-surface-variant truncate">{{ inv.job_title || 'Sin cargo' }}</span>
            </div>

            <div class="flex flex-col sm:w-48 shrink-0">
              <span
                class="text-body-compact font-medium"
                [class]="expired ? 'text-error' : soon(inv.expires_at) ? 'text-tertiary' : 'text-on-surface'"
                [attr.title]="formatDateTime(inv.expires_at)"
                >{{ expiry(inv.expires_at) }}</span
              >
              <span class="text-caption text-on-surface-variant">
                {{ inv.send_count > 1 ? 'Reenviada ' + relative(inv.last_sent_at) : 'Enviada ' + relative(inv.last_sent_at) }}
              </span>
            </div>

            @if (canManage()) {
              <div class="flex items-center gap-1 sm:justify-end shrink-0">
                <button
                  type="button"
                  class="h-8 px-3 rounded-[4px] text-label-compact border-0 cursor-pointer whitespace-nowrap"
                  [class]="expired ? 'bg-primary text-on-primary hover:bg-brand-hover' : 'bg-transparent text-primary hover:bg-surface-container'"
                  (click)="resend.emit(inv)"
                >
                  Reenviar
                </button>
                <button
                  type="button"
                  class="w-8 h-8 inline-flex items-center justify-center rounded-[4px] text-on-surface-variant hover:text-error hover:bg-error-container/60 border-0 bg-transparent cursor-pointer"
                  [attr.aria-label]="'Anular la invitación de ' + inv.email"
                  title="Anular invitación"
                  (click)="revoke.emit(inv)"
                >
                  <app-material-icon name="block" [size]="17" />
                </button>
              </div>
            }
          </li>
        }
      </ul>
    </section>
  `,
})
export class InvitationsPanel {
  readonly invitations = input.required<ReadonlyArray<Invitation>>();
  readonly canManage = input(false);
  readonly resend = output<Invitation>();
  readonly revoke = output<Invitation>();

  readonly roleLabel = ROLE_LABEL;
  readonly expiry = expiryLabel;
  readonly soon = expiresSoon;
  readonly relative = formatRelativeTime;
  readonly formatDateTime = formatBogotaDateTime;
}
