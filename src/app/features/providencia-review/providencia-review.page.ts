import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiError } from '../../core/api/client';
import { documentsApi } from '../../core/api/endpoints';
import { errorText } from '../../core/api/errors';

/**
 * `/documents/:id` (alertas, línea de tiempo, expediente): la providencia se revisa dentro
 * de su correo. Busca el `message_id` y redirige a `/bandeja/:messageId?doc=:id`.
 */
@Component({
  selector: 'app-providencia-review-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="max-w-[1120px] w-full mx-auto px-margin-tablet lg:px-margin-desktop py-space-md">
      @if (error(); as err) {
        <div class="p-space-md rounded-lg bg-[#FEF2F2] text-[#991B1B]">
          {{ err }}
          <button
            type="button"
            class="ml-2 underline border-0 bg-transparent cursor-pointer text-inherit"
            (click)="resolve()"
          >
            Reintentar
          </button>
          <a routerLink="/documents" class="ml-2 underline text-inherit">Volver a la bandeja</a>
        </div>
      } @else {
        <p class="text-body-default text-on-surface-variant">Abriendo providencia…</p>
      }
    </div>
  `,
})
export class ProvidenciaReviewPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly error = signal<string | null>(null);
  private attachmentId = '';

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.attachmentId = params.get('id') ?? '';
      void this.resolve();
    });
  }

  async resolve(): Promise<void> {
    this.error.set(null);
    if (!this.attachmentId) {
      this.error.set('Providencia no encontrada');
      return;
    }
    try {
      const doc = await documentsApi.get(this.attachmentId);
      void this.router.navigate(['/bandeja', doc.message_id], {
        queryParams: { doc: doc.attachment_id },
        replaceUrl: true,
      });
    } catch (e) {
      this.error.set(
        e instanceof ApiError && e.status === 404
          ? 'Providencia no encontrada'
          : errorText(e instanceof ApiError ? e.code : null),
      );
    }
  }
}
