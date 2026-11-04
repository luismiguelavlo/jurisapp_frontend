import { Injectable, signal } from '@angular/core';
import { caseFilesApi } from '../api/endpoints';

/** Contador del badge "Sin clasificar" (menú + pantalla). */
@Injectable({ providedIn: 'root' })
export class UnassignedService {
  readonly total = signal(0);
  readonly adjuntos = signal(0);

  async refresh(): Promise<void> {
    try {
      const c = await caseFilesApi.unassignedCount();
      this.total.set(c.total);
      this.adjuntos.set(c.adjuntos);
    } catch {
      // silencioso: el badge se oculta con 0
    }
  }
}
