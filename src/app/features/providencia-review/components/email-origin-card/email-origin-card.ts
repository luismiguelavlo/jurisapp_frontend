import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { EmailConnection, MessageDetail, MessageOrigin } from '../../../../core/api/types';
import { formatBogotaDateTime, relativeFromNow } from '../../../../core/utils/date-format';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';

@Component({
  selector: 'app-email-origin-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    <article class="bg-surface-container-lowest rounded-lg p-space-md shadow-sm">
      <div
        class="flex items-center justify-between mb-space-sm pb-space-xs border-b border-surface-container-high"
      >
        <h2 class="text-headline-sm text-on-surface flex items-center gap-space-xs m-0">
          <app-material-icon name="mark_email_read" [size]="18" className="text-primary" />
          <span>Origen del correo</span>
        </h2>
        @if (verified()) {
          <span
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] bg-[#DCFCE7] text-[#15803D] text-caption font-medium"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-[#16A34A]"></span>
            Remitente verificado
          </span>
        }
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-space-sm text-body-compact">
        <div>
          <p class="text-caption text-on-surface-variant mb-0.5 mt-0">Remitente oficial:</p>
          <span class="font-mono text-on-surface font-medium">{{
            correo().remitente || '—'
          }}</span>
        </div>
        <div>
          <p class="text-caption text-on-surface-variant mb-0.5 mt-0">Buzón de recepción:</p>
          <p class="text-on-surface flex items-center gap-1 m-0">
            <app-material-icon name="mail" [size]="14" className="text-on-surface-variant" />
            <span>{{ connection()?.mailbox_address || '—' }}</span>
            @if (providerShort()) {
              <span class="text-caption text-on-surface-variant">({{ providerShort() }})</span>
            }
          </p>
        </div>
        <div class="md:col-span-2">
          <p class="text-caption text-on-surface-variant mb-0.5 mt-0">Asunto original:</p>
          <p
            class="text-on-surface font-medium bg-surface-container-low p-2 rounded text-body-compact m-0"
          >
            {{ correo().asunto || '—' }}
          </p>
        </div>
        <div>
          <p class="text-caption text-on-surface-variant mb-0.5 mt-0">
            Fecha de notificación:
          </p>
          <p class="text-on-surface m-0">{{ receivedDisplay() }}</p>
        </div>
      </div>
    </article>
  `,
})
export class EmailOriginCard {
  readonly correo = input.required<MessageOrigin>();
  readonly connection = input<EmailConnection | null>(null);
  readonly message = input<MessageDetail | null>(null);

  readonly verified = computed(() => this.message()?.content_status === 'available');

  readonly providerShort = computed(() => {
    const p = this.connection()?.provider;
    if (!p) return null;
    if (p === 'microsoft_graph') return 'M365';
    if (p === 'gmail') return 'Gmail';
    return 'IMAP';
  });

  readonly receivedDisplay = computed(() => {
    const iso = this.correo().recibido_at ?? this.message()?.first_seen_at ?? null;
    if (!iso) return '—';
    const base = formatBogotaDateTime(iso);
    const rel = relativeFromNow(iso);
    const suffix = this.correo().recibido_at ? rel : `${rel} · detectado`;
    return `${base} (${suffix})`;
  });

}
