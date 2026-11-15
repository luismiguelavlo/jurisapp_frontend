import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { formatBogotaDateTime } from '../../../../../core/utils/date-format';
import { ROLE_HELP, ROLE_LABEL, type InvitationPreview } from '../../../../users/models/users.models';

/** El lado izquierdo: a qué te invitan, con qué rol y hasta cuándo vale el enlace. */
@Component({
  selector: 'app-invitation-letter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = preview();
    <section class="min-w-0 flex flex-col gap-6 max-w-[34rem]">
      <h1 class="m-0 text-[32px] leading-[40px] sm:text-[40px] sm:leading-[48px] text-on-surface">
        {{ p.first_name }}, te invitaron a trabajar en {{ p.tenant_name }}.
      </h1>
      <dl class="m-0 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 pt-6 border-t border-outline-variant text-body-default">
        <dt class="text-on-surface-variant">Entrarás como</dt>
        <dd class="m-0 text-on-surface">
          <span class="font-medium">{{ roleLabel[p.role] }}</span>
          @if (p.job_title) {
            <span class="text-on-surface-variant">, {{ p.job_title }}</span>
          }
          <span class="block text-body-compact text-on-surface-variant mt-0.5">{{ roleHelp[p.role] }}</span>
        </dd>
        <dt class="text-on-surface-variant">Con el correo</dt>
        <dd class="m-0 text-on-surface break-all">{{ p.email }}</dd>
        <dt class="text-on-surface-variant">El enlace vale hasta</dt>
        <dd class="m-0 text-on-surface"><time>{{ expires() }}</time></dd>
      </dl>
    </section>
  `,
})
export class InvitationLetter {
  readonly preview = input.required<InvitationPreview>();
  readonly roleLabel = ROLE_LABEL;
  readonly roleHelp = ROLE_HELP;
  expires(): string {
    return formatBogotaDateTime(this.preview().expires_at);
  }
}
