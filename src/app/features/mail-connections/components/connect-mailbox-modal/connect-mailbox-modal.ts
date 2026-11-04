import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ApiError } from '../../../../core/api/client';
import { integrationsApi } from '../../../../core/api/endpoints';
import { errorText } from '../../../../core/api/errors';
import { providerLabel } from '../../../../core/api/labels';
import type { EmailConnection, ProviderId, ProviderInfo } from '../../../../core/api/types';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';
import {
  MAIL_PROVIDER_OPTIONS,
  type ImapErrorCode,
  type MailProvider,
  type MailProviderOption,
} from '../../models/connect-mailbox.models';
import { ConnectStepper } from './connect-stepper';
import { ImapConfigForm } from './imap-config-form';
import { MailboxProviderOption } from './mailbox-provider-option';
import { OauthConsentPanel } from './oauth-consent-panel';

const PROVIDER_MAP: Record<Exclude<ProviderId, 'imap'>, MailProvider> = {
  microsoft_graph: 'microsoft',
  gmail: 'google',
};

const PROVIDER_TO_API: Record<Exclude<MailProvider, 'imap'>, Exclude<ProviderId, 'imap'>> = {
  microsoft: 'microsoft_graph',
  google: 'gmail',
};

@Component({
  selector: 'app-connect-mailbox-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MaterialIcon,
    ConnectStepper,
    MailboxProviderOption,
    OauthConsentPanel,
    ImapConfigForm,
  ],
  template: `
    <div
      class="fixed inset-0 top-14 left-60 bg-inverse-surface/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-space-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="connect-mailbox-title"
      (click)="onBackdropClick($event)"
    >
      <div
        class="w-full max-w-[540px] bg-surface-container-lowest rounded-[6px] p-6 shadow-sm flex flex-col gap-space-lg relative my-auto"
        (click)="$event.stopPropagation()"
      >
        <div class="flex items-start justify-between">
          <div class="flex flex-col gap-0.5">
            <div class="flex items-center gap-space-xs">
              <span
                id="connect-mailbox-title"
                class="text-headline-sm text-on-surface font-semibold"
                >Conectar buzón</span
              >
              <span
                class="px-space-xs py-0.5 rounded-[4px] bg-surface-container text-on-surface-variant text-caption font-medium"
                >Área Operativa</span
              >
            </div>
            <p class="text-caption text-on-surface-variant mb-0">
              Configura un origen de correo para lectura de metadatos y triaje clínico asistido.
            </p>
          </div>
          <button
            type="button"
            class="w-7 h-7 -mr-1 -mt-1 rounded-[6px] flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low cursor-pointer"
            aria-label="Cerrar"
            (click)="closed.emit()"
          >
            <app-material-icon name="close" [size]="16" />
          </button>
        </div>

        @if (loadingProviders()) {
          <p class="text-body-compact text-on-surface-variant m-0">Cargando proveedores…</p>
        } @else if (availableOptions().length === 0) {
          <p class="text-body-compact text-on-surface-variant m-0">
            No hay proveedores configurados.
          </p>
        } @else {
          <app-connect-stepper [provider]="provider()" />

          <div class="flex flex-col gap-space-sm">
            <label
              class="text-label-compact text-on-surface-variant uppercase tracking-wider text-[11px]"
              >Seleccionar tipo de integración</label
            >
            @for (option of availableOptions(); track option.id) {
              <app-mailbox-provider-option
                [option]="option"
                [selected]="provider() === option.id"
                (select)="provider.set($event)"
              />
            }
          </div>

          @if (provider() !== 'imap') {
            <app-oauth-consent-panel [provider]="oauthProvider()" />
          } @else {
            @if (imapBanner(); as banner) {
              <div
                class="p-3 rounded-[6px] bg-error-container text-on-error-container flex items-start gap-space-xs"
              >
                <app-material-icon name="error" [size]="16" className="text-error shrink-0 mt-0.5" />
                <div class="flex flex-col">
                  <span class="text-label-compact font-semibold text-error">{{ banner.title }}</span>
                  <span class="text-caption">{{ banner.description }}</span>
                </div>
              </div>
            }
            <app-imap-config-form
              [errorCode]="imapError()"
              (errorCodeChange)="imapError.set($event)"
            />
          }

          <div class="flex items-center justify-between pt-1">
            <div class="flex items-center gap-space-xs text-on-surface-variant">
              <app-material-icon
                name="shield_with_heart"
                [size]="15"
                className="text-primary-container"
              />
              <span class="text-caption">
                Operación bajo rol
                <span class="font-medium text-on-surface">{{ auth.role() }}</span
                >.
              </span>
            </div>
          </div>

          <div class="flex items-center justify-end gap-space-sm pt-2">
            <button
              type="button"
              class="h-9 px-space-md rounded-[6px] bg-surface-container-low text-on-surface text-label-default font-medium cursor-pointer"
              (click)="closed.emit()"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="h-9 px-space-md rounded-[6px] bg-primary-container text-on-primary text-label-default font-medium flex items-center gap-space-xs cursor-pointer disabled:opacity-80"
              [disabled]="submitting()"
              (click)="onSubmit()"
            >
              <span>{{ submitLabel() }}</span>
              <app-material-icon [name]="submitIcon()" [size]="16" />
            </button>
          </div>
        }
      </div>
    </div>
  `,
})
export class ConnectMailboxModal {
  readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly closed = output<void>();
  readonly connected = output<EmailConnection>();

  readonly availableOptions = signal<MailProviderOption[]>([]);
  readonly loadingProviders = signal(true);
  readonly provider = signal<MailProvider>('microsoft');
  readonly imapError = signal<ImapErrorCode>('none');
  readonly imapBanner = signal<{ title: string; description: string } | null>(null);
  readonly submitting = signal(false);

  private readonly imapForm = viewChild(ImapConfigForm);

  readonly oauthProvider = computed<'microsoft' | 'google'>(() =>
    this.provider() === 'google' ? 'google' : 'microsoft',
  );

  readonly submitLabel = computed(() => {
    if (this.submitting()) {
      return 'Validando conexión...';
    }
    switch (this.provider()) {
      case 'microsoft':
        return 'Continuar con Microsoft 365';
      case 'google':
        return 'Continuar con Google Workspace';
      default:
        return 'Verificar y conectar';
    }
  });

  readonly submitIcon = computed(() =>
    this.provider() === 'imap' && !this.submitting() ? 'check_circle' : 'arrow_forward',
  );

  constructor() {
    void this.loadProviders();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closed.emit();
    }
  }

  async onSubmit(): Promise<void> {
    const selected = this.provider();
    this.submitting.set(true);
    this.imapBanner.set(null);

    try {
      if (selected === 'imap') {
        await this.submitImap();
      } else {
        await this.submitOAuth(selected);
      }
    } catch (error) {
      this.handleError(error);
    } finally {
      this.submitting.set(false);
    }
  }

  private async loadProviders(): Promise<void> {
    this.loadingProviders.set(true);
    try {
      const providers = await integrationsApi.providers();
      const options = this.mapProviders(providers);
      this.availableOptions.set(options);
      if (options.length > 0) {
        this.provider.set(options[0].id);
      }
    } catch {
      this.toast.push({
        type: 'error',
        title: 'Error',
        description: 'No se pudieron cargar los proveedores.',
      });
      this.availableOptions.set([]);
    } finally {
      this.loadingProviders.set(false);
    }
  }

  private mapProviders(providers: ProviderInfo[]): MailProviderOption[] {
    return providers
      .map((info) => {
        if (info.provider === 'imap') {
          return MAIL_PROVIDER_OPTIONS.find((o) => o.id === 'imap');
        }
        const uiId = PROVIDER_MAP[info.provider];
        return MAIL_PROVIDER_OPTIONS.find((o) => o.id === uiId);
      })
      .filter((option): option is MailProviderOption => option !== undefined);
  }

  private async submitOAuth(selected: 'microsoft' | 'google'): Promise<void> {
    const apiProvider = PROVIDER_TO_API[selected];
    const { authorization_url } = await integrationsApi.authorize(apiProvider);
    window.location.assign(authorization_url);
  }

  private async submitImap(): Promise<void> {
    const form = this.imapForm();
    if (!form) {
      return;
    }
    const values = form.getRawValue();
    try {
      const conn = await integrationsApi.connectImap({
        mailbox_address: values.email,
        host: values.server,
        port: 993,
        username: values.username,
        password: values.password,
      });
      form.form.controls.password.reset('');
      this.connected.emit(conn);
    } catch (error) {
      form.form.controls.password.reset('');
      throw error;
    }
  }

  private handleError(error: unknown): void {
    if (error instanceof ApiError) {
      if (error.status === 404) {
        this.toast.push({
          type: 'error',
          title: 'Proveedor no disponible',
          description: providerLabel.microsoft_graph,
        });
        return;
      }
      if (error.status === 429) {
        this.toast.push({
          type: 'error',
          title: 'Demasiadas solicitudes',
          description: 'Espera un momento.',
        });
        return;
      }
      if (error.status === 403) {
        this.toast.push({
          type: 'error',
          title: 'Permisos insuficientes',
          description: 'Tu rol no permite conectar buzones.',
        });
        return;
      }
      if (error.status === 422 || error.status === 409) {
        this.imapBanner.set({
          title: 'Error de validación',
          description: errorText(error.code),
        });
        return;
      }
      this.toast.push({
        type: 'error',
        title: 'Error',
        description: errorText(error.code),
      });
      return;
    }
    this.toast.push({
      type: 'error',
      title: 'Error',
      description: 'Ocurrió un error. Intenta de nuevo.',
    });
  }
}
