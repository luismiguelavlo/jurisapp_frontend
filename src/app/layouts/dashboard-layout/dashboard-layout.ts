import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toast } from '../../shared/components/toast/toast';
import { DashboardSidebar } from './components/dashboard-sidebar';
import { DashboardTopbar } from './components/dashboard-topbar';

@Component({
  selector: 'app-dashboard-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, DashboardSidebar, DashboardTopbar, Toast],
  template: `
    <div
      class="bg-background text-on-surface antialiased min-h-screen"
    >
      <app-dashboard-sidebar />
      <div class="pl-60">
        <app-dashboard-topbar />
        <main class="relative pt-14 bg-background min-h-screen">
          <router-outlet />
        </main>
      </div>
      <app-toast />
    </div>
  `,
})
export class DashboardLayout {}
