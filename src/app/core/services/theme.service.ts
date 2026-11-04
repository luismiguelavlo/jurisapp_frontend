import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

const STORAGE_KEY = 'salud-auto-theme';

export type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly preferred = signal<ThemeMode>(this.readInitialTheme());

  readonly isDark = computed(() => this.preferred() === 'dark');

  constructor() {
    this.apply(this.preferred());
  }

  toggle(): void {
    const next: ThemeMode = this.preferred() === 'dark' ? 'light' : 'dark';
    this.preferred.set(next);
    this.apply(next);
  }

  private apply(mode: ThemeMode): void {
    this.document.documentElement.classList.toggle('dark', mode === 'dark');
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Ignore storage failures (private mode, etc.)
    }
  }

  private readInitialTheme(): ThemeMode {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'dark' || stored === 'light') {
        return stored;
      }
    } catch {
      // Ignore
    }
    return 'light';
  }
}
