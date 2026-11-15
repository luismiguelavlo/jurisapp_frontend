import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, PASSWORD_CHANGE_PATH } from '../services/auth.service';

async function ensureReady(auth: AuthService): Promise<void> {
  if (!auth.ready()) {
    await auth.bootstrap();
  }
}

/** Sesión completa. Con token restringido solo se puede ir a crear la contraseña nueva. */
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await ensureReady(auth);

  if (!auth.me()) {
    return router.createUrlTree(['/login']);
  }
  if (auth.passwordChangeRequired()) {
    return router.createUrlTree([PASSWORD_CHANGE_PATH]);
  }
  return true;
};

export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await ensureReady(auth);

  if (auth.me()) {
    return router.createUrlTree([auth.passwordChangeRequired() ? PASSWORD_CHANGE_PATH : auth.homePath()]);
  }
  return true;
};

/** /cambiar-contrasena: solo quien entró con una contraseña temporal. */
export const passwordChangeGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await ensureReady(auth);

  if (!auth.me()) {
    return router.createUrlTree(['/login']);
  }
  if (!auth.passwordChangeRequired()) {
    return router.createUrlTree(['/documents']);
  }
  return true;
};

/** Vistas de todo el tenant (buzones, "Sin clasificar", entidad): el auxiliar vuelve a su bandeja (SPEC 24). */
export const notScopedGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await ensureReady(auth);
  return auth.isScoped() ? router.createUrlTree(['/documents']) : true;
};
