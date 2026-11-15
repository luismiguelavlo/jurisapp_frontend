import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppFooter } from '../../shared/components/app-footer/app-footer';
import { AppHeader } from '../../shared/components/app-header/app-header';
import { Toast } from '../../shared/components/toast/toast';

@Component({
  selector: 'app-auth-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, AppHeader, AppFooter, Toast],
  template: `
    <div class="bg-background text-on-surface min-h-screen flex flex-col">
      <app-header />
      <main class="flex-1 flex flex-col">
        <router-outlet />
      </main>
      <app-footer />
      <app-toast />
    </div>
  `,
})
export class AuthLayout {}
