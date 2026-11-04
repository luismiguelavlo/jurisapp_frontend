import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppFooter } from '../../shared/components/app-footer/app-footer';
import { AppHeader } from '../../shared/components/app-header/app-header';

@Component({
  selector: 'app-auth-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, AppHeader, AppFooter],
  template: `
    <div class="bg-surface text-on-surface min-h-screen flex flex-col justify-between">
      <app-header />
      <main class="flex-1 flex flex-col">
        <router-outlet />
      </main>
      <app-footer />
    </div>
  `,
})
export class AuthLayout {}
