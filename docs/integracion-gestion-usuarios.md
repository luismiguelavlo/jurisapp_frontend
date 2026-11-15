# Integración frontend: gestión de usuarios (SPEC 22)

Lo que el frontend necesita para:

1. Que **owner/admin** inviten usuarios con un **enlace de un solo uso**, los vean, editen, suspendan, eliminen y les asignen una **contraseña temporal**.
2. Que el invitado **cree su contraseña** desde el enlace.
3. Que quien entra con una contraseña temporal quede **obligado a cambiarla**.
4. Que cada usuario edite su nombre y cambie su contraseña.

Todos los errores de negocio llegan como `{"detail": "<codigo_snake_case>"}`.

---

## 1. Roles y reglas

| Acción | owner | admin | member |
|---|---|---|---|
| Ver lista de usuarios (`GET /users`) | ✔ (con campos de admin) | ✔ (con campos de admin) | ✔ (campos de admin en `null`) |
| Invitar, editar, suspender, eliminar, restablecer contraseña | a todos | a `admin` y `member` | ✘ (403) |
| Conceder rol `owner` | ✔ | ✘ (`role_not_allowed`) | ✘ |

- Nadie se modifica a sí mismo por `/users/{id}` (`cannot_modify_self`): rol, estado y contraseña propia van por `/me` y `/auth/password/change`.
- **Nombre, apellido y contraseña** son de la cuenta (una cuenta puede estar en varios tenants). Si el usuario pertenece a otro tenant, el admin no puede cambiarlos: `409 user_in_other_tenants`. **Cargo, rol y estado** son de este tenant y siempre se pueden cambiar.
- **Eliminar** es baja lógica (`status: "removed"`): el usuario sigue en `GET /users` porque es autor de correos, carpetas, revisiones… Se puede volver a invitar (se reactiva con el rol nuevo).
- Suspender, eliminar o cambiar el rol **cierra sus sesiones al instante** (el siguiente request devuelve 401).

---

## 2. Tipos (TypeScript)

```ts
export type UserRole = 'owner' | 'admin' | 'member';
export type MembershipStatus = 'active' | 'suspended' | 'removed';
export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export interface TokenResponse {
  access_token: string;
  refresh_token: string | null;       // null solo si password_change_required
  token_type: 'bearer';
  expires_in: number;                 // segundos
  password_change_required: boolean;  // NUEVO
}

export interface Me {
  user_id: string;
  email: string;
  tenant: { id: string; slug: string; name: string };
  role: UserRole;
  first_name: string | null;          // NUEVO
  last_name: string | null;           // NUEVO
  job_title: string | null;           // NUEVO (cargo en este tenant)
  password_change_required: boolean;  // NUEVO
}

export interface TenantUser {
  id: string;
  email: string;
  role: UserRole;
  is_active: boolean;                 // = status === 'active' (compatibilidad)
  first_name: string | null;
  last_name: string | null;
  job_title: string | null;
  status: MembershipStatus;
  // Solo owner/admin; null para member:
  password_change_required: boolean | null;  // tiene una contraseña temporal pendiente
  last_login_at: string | null;
  invited_by: string | null;
  status_changed_at: string | null;
  status_changed_by: string | null;
  created_at: string | null;          // alta en el tenant
  updated_at: string | null;
}

export interface Invitation {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  job_title: string | null;
  role: UserRole;
  status: InvitationStatus;           // expired = pendiente vencida (reenviable)
  expires_at: string;
  invited_by: string;
  send_count: number;
  last_sent_at: string;
  accepted_at: string | null;
  accepted_user_id: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  created_at: string;
}

export interface InvitationIssued {
  invitation: Invitation;
  invitation_url: string | null;      // null si el backend no tiene APP_PUBLIC_URL
  invitation_token: string;           // para armar el enlace si invitation_url es null
  email_sent: boolean;                // false → mostrar el enlace para copiarlo
}

export interface InvitationPreview {
  email: string;
  first_name: string;
  last_name: string;
  job_title: string | null;
  role: UserRole;
  tenant_name: string;
  expires_at: string;
  account_exists: boolean;            // true → pedir su contraseña ACTUAL, no crear una
  password_min_length: number;        // 12
}

export interface InvitationAcceptResult extends TokenResponse {
  tenant_slug: string;
}

export interface TemporaryPassword {
  temporary_password: string;         // mostrar UNA vez
  expires_at: string;
}
```

---

## 3. Endpoints de administración (owner/admin)

| Método | Ruta | Cuerpo | Respuesta |
|---|---|---|---|
| GET | `/users?status=active&status=suspended&q=texto` | — | `TenantUser[]` (sin filtro: todos, también removed) |
| GET | `/users/{id}` | — | `TenantUser` |
| PATCH | `/users/{id}` | parcial: `{first_name?, last_name?, job_title?, role?, status?: 'active'\|'suspended'}` | `TenantUser` |
| DELETE | `/users/{id}` | — | 204 (idempotente) |
| POST | `/users/{id}/password-reset` | — | `TemporaryPassword` |
| GET | `/users/invitations?status=pending&status=expired` | — | `Invitation[]` (recientes primero) |
| POST | `/users/invitations` | `{email, first_name, last_name, job_title?, role?='member'}` | 201 `InvitationIssued` |
| POST | `/users/invitations/{id}/resend` | — | `InvitationIssued` (nuevo enlace; el anterior deja de valer) |
| DELETE | `/users/invitations/{id}` | — | 204 |

`PATCH`: `job_title: null` o `""` borra el cargo; el resto no admite `null`. Solo se envía lo que cambia.

Errores:

| Código | HTTP | Qué mostrar |
|---|---|---|
| `role_not_allowed` | 403 | No tienes permiso sobre ese rol |
| `cannot_modify_self` | 409 | Usa "Mi perfil" |
| `user_already_member` | 409 | Ya es miembro |
| `invitation_already_pending` | 409 | Ya tiene una invitación pendiente → ofrecer "Reenviar" |
| `invitation_not_pending` | 409 | La invitación ya fue aceptada o revocada |
| `user_removed` | 409 | Usuario eliminado: reinvitar |
| `user_in_other_tenants` | 409 | Pertenece a otra organización: no se puede cambiar su nombre ni su contraseña |
| `user_not_found` / `invitation_not_found` | 404 | |
| validación (`invalid_email`, `invalid_name`, …) | 422 | |

---

## 4. Flujo: invitación

```
Admin: POST /users/invitations ──► email_sent ? "Invitación enviada" : mostrar invitation_url con botón Copiar
                                         │
Invitado abre {APP_PUBLIC_URL}/invitacion#token=XXXX
   1. Leer el token de location.hash (va en el fragmento: no llega a ningún servidor)
   2. POST /auth/invitations/preview {token}  → 404 invalid_invitation = "Enlace inválido o vencido"
   3. Formulario:
        account_exists=false → nombre/apellido (prellenados, editables) + contraseña + confirmar
        account_exists=true  → solo "tu contraseña actual" (ya tiene cuenta en otra organización)
   4. POST /auth/invitations/accept {token, password, first_name?, last_name?}
        200 → guardar tokens y tenant_slug (sesión iniciada) → ir al inicio
        422 weak_password      → mínimo 12 caracteres, no igual al email
        401                    → contraseña actual incorrecta (account_exists)
        404 invalid_invitation → enlace usado/vencido/revocado
        429                    → demasiados intentos (Retry-After)
```

La ruta del frontend se configura en el backend con `INVITATION_ACCEPT_PATH` (por defecto `/invitacion`). Vigencia: `INVITATION_TTL_HOURS` (72 h).

---

## 5. Flujo: contraseña temporal (restablecer)

```
Admin: POST /users/{id}/password-reset → mostrar temporary_password UNA vez (copiar) y expires_at
       (todas las sesiones del usuario se cierran)

Usuario: POST /auth/login con la temporal
   → 200 { password_change_required: true, refresh_token: null, access_token: <restringido> }
   → llevar a la pantalla "Crea tu nueva contraseña" (sin pedir la actual)
   POST /auth/password/change {new_password}  (Authorization: Bearer <restringido>)
   → 200 TokenResponse normal: reemplazar los tokens guardados y continuar
```

- La temporal sirve para **un solo login** (un segundo intento devuelve 401) y vence en `TEMPORARY_PASSWORD_TTL_HOURS` (24 h). Si el usuario cierra la pestaña sin cambiarla, el admin debe generar otra.
- Con el token restringido solo funcionan `GET /me` y `POST /auth/password/change`; el resto responde **403 `password_change_required`**. Interceptor recomendado: ante ese 403, redirigir a la pantalla de cambio.
- El token restringido no se renueva (sin refresh token) y dura `expires_in` segundos.

---

## 6. Autoservicio

| Método | Ruta | Cuerpo | Respuesta |
|---|---|---|---|
| GET | `/me` | — | `Me` |
| PATCH | `/me` | `{first_name, last_name}` | `Me` |
| POST | `/auth/password/change` | `{current_password, new_password}` | `TokenResponse` (nueva sesión) |

`/auth/password/change` cierra **todas** las sesiones del usuario (otros dispositivos incluidos) y devuelve tokens nuevos: guardarlos. Errores: 400 `invalid_credentials` (actual incorrecta; **no** es 401 para no disparar el logout del interceptor), 422 `weak_password` | `password_reused`, 429.

---

## 7. Cambios en lo existente

- `POST /auth/login` y `/auth/refresh`: campo nuevo `password_change_required`; `refresh_token` puede ser `null` (solo en el caso anterior).
- `GET /me`: campos nuevos (`first_name`, `last_name`, `job_title`, `password_change_required`). Acepta el token restringido.
- `GET /users`: campos nuevos; `is_active` ahora es `false` también para suspendidos y eliminados. Mostrar el nombre (`first_name last_name`) en vez del email cuando exista.
- Login de un usuario suspendido o eliminado: 401 genérico (igual que credenciales inválidas).
- CORS admite `PATCH` y `PUT` (antes solo GET/POST/DELETE).
