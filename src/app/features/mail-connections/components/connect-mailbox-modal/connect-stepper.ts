import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { MailProvider } from '../../models/connect-mailbox.models';

@Component({
  selector: 'app-connect-stepper',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid grid-cols-2 gap-space-xs bg-surface-container-low p-1 rounded-[6px]">
      <div
        class="flex items-center justify-center gap-space-xs py-1.5 px-space-xs rounded-[4px] bg-surface-container-lowest shadow-sm text-on-surface"
      >
        <span
          class="w-4 h-4 rounded-full bg-primary-container text-on-primary text-[11px] font-semibold flex items-center justify-center"
          >1</span
        >
        <span class="text-label-compact font-medium">Proveedor de correo</span>
      </div>
      <div
        class="flex items-center justify-center gap-space-xs py-1.5 px-space-xs rounded-[4px] text-on-surface-variant"
      >
        <span
          class="w-4 h-4 rounded-full bg-surface-container-high text-on-surface-variant text-[11px] font-semibold flex items-center justify-center"
          >2</span
        >
        <span class="text-label-compact font-medium">{{ stepTwoLabel() }}</span>
      </div>
    </div>
  `,
})
export class ConnectStepper {
  readonly provider = input.required<MailProvider>();

  readonly stepTwoLabel = computed(() =>
    this.provider() === 'imap' ? 'Parámetros IMAP' : 'Consentimiento OAuth',
  );
}
