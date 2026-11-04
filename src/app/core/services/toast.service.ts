import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'sync' | 'error' | 'warn';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly items = signal<ReadonlyArray<ToastItem>>([]);
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  /** Compatibilidad: toast simple de una línea. */
  show(message: string, durationMs = 2800): void {
    this.push({ type: 'success', title: message, description: '' }, durationMs);
  }

  push(
    toast: { type: ToastType; title: string; description: string },
    durationMs = 4000,
  ): void {
    const id = crypto.randomUUID();
    this.items.update((current) => [...current, { id, ...toast }]);

    const timer = setTimeout(() => this.dismiss(id), durationMs);
    this.timers.set(id, timer);
  }

  dismiss(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.items.update((current) => current.filter((item) => item.id !== id));
  }
}
