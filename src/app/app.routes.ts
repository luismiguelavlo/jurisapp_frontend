import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./layouts/auth-layout/auth-layout').then((m) => m.AuthLayout),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/auth/login/login.page').then((m) => m.LoginPage),
      },
    ],
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layouts/dashboard-layout/dashboard-layout').then((m) => m.DashboardLayout),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'documents',
      },
      {
        path: 'documents',
        loadComponent: () =>
          import('./features/documents-inbox/documents-inbox.page').then(
            (m) => m.DocumentsInboxPage,
          ),
      },
      {
        path: 'documents/:id',
        loadComponent: () =>
          import('./features/providencia-review/providencia-review.page').then(
            (m) => m.ProvidenciaReviewPage,
          ),
      },
      {
        path: 'cases',
        loadComponent: () =>
          import('./features/cases/cases-list.page').then((m) => m.CasesListPage),
      },
      {
        path: 'cases/sin-clasificar',
        loadComponent: () =>
          import('./features/cases/unassigned.page').then((m) => m.UnassignedPage),
      },
      {
        path: 'cases/:id',
        loadComponent: () =>
          import('./features/cases/case-detail.page').then((m) => m.CaseDetailPage),
      },
      {
        path: 'procesos/sin-clasificar',
        redirectTo: 'cases/sin-clasificar',
      },
      {
        path: 'conexiones',
        loadComponent: () =>
          import('./features/mail-connections/mail-connections.page').then(
            (m) => m.MailConnectionsPage,
          ),
      },
      {
        path: 'conexiones/resultado',
        loadComponent: () =>
          import('./features/auth/oauth-callback/oauth-callback.page').then(
            (m) => m.OauthCallbackPage,
          ),
      },
      {
        path: 'conexiones/:id',
        loadComponent: () =>
          import('./features/mailbox-detail/mailbox-detail.page').then(
            (m) => m.MailboxDetailPage,
          ),
      },
      {
        path: 'configuracion/entidad',
        loadComponent: () =>
          import('./features/entity-settings/entity-settings.page').then(
            (m) => m.EntitySettingsPage,
          ),
      },
      {
        path: 'providencias',
        pathMatch: 'full',
        redirectTo: 'documents',
      },
      {
        path: 'providencias/:id',
        redirectTo: 'documents/:id',
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'documents',
  },
];
