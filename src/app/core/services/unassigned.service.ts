import { Injectable, inject, signal } from '@angular/core';
import { caseFilesApi } from '../api/endpoints';
import { AuthService } from './auth.service';

/** Contador del badge "Sin clasificar" (menú + pantalla). */
@Injectable({ providedIn: 'root' })
export class UnassignedService {
  readonly total = signal(0);
  readonly adjuntos = signal(0);
  private readonly auth = inject(AuthService);

  async refresh(): Promise<void> {
    // "Sin clasificar" es de todo el tenant: el auxiliar recibe 403 (SPEC 24).
    if (this.auth.isScoped()) {
      this.total.set(0);
      this.adjuntos.set(0);
      return;
    }
    try {
      const c = await caseFilesApi.unassignedCount();
      this.total.set(c.total);
      this.adjuntos.set(c.adjuntos);
    } catch {
      // silencioso: el badge se oculta con 0
    }
  }
}
