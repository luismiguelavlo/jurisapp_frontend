import { Routes } from '@angular/router';
import { authGuard, guestGuard, notScopedGuard, passwordChangeGuard } from './core/guards/auth.guard';

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
    loadComponent: () =>
      import('./layouts/auth-layout/auth-layout').then((m) => m.AuthLayout),
    children: [
      {
        // Sin esto, la URL raíz ("/") hace match con este layout sin hijo → pantalla en blanco.
        path: '',
        pathMatch: 'full',
        redirectTo: '/documents',
      },
      {
        path: 'invitacion',
        loadComponent: () =>
          import('./features/auth/invitation/invitation.page').then((m) => m.InvitationPage),
      },
      {
        path: 'cambiar-contrasena',
        canActivate: [passwordChangeGuard],
        loadComponent: () =>
          import('./features/auth/password-change/forced-password-change.page').then(
            (m) => m.ForcedPasswordChangePage,
          ),
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
        path: 'bandeja/:messageId',
        loadComponent: () =>
          import('./features/message-detail/message-detail.page').then(
            (m) => m.MessageDetailPage,
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
        canActivate: [notScopedGuard],
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
        canActivate: [notScopedGuard],
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
        canActivate: [notScopedGuard],
        loadComponent: () =>
          import('./features/mailbox-detail/mailbox-detail.page').then(
            (m) => m.MailboxDetailPage,
          ),
      },
      {
        path: 'configuracion/entidad',
        canActivate: [notScopedGuard],
        loadComponent: () =>
          import('./features/entity-settings/entity-settings.page').then(
            (m) => m.EntitySettingsPage,
          ),
      },
      {
        path: 'configuracion/usuarios',
        loadComponent: () =>
          import('./features/users/users.page').then((m) => m.UsersPage),
      },
      {
        path: 'mi-perfil',
        loadComponent: () =>
          import('./features/profile/profile.page').then((m) => m.ProfilePage),
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
