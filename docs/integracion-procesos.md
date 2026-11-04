# Integración: Procesos (Expediente y Sin clasificar)

Cómo conectar con la API de SPEC 19 y SPEC 20 las pantallas diseñadas en Stitch (`docs/stitch/`):

- **Expediente del proceso** (`detalle-expediente.html`): árbol de carpetas + tabla de documentos, vista member y admin. Secciones 0-6.
- **Sin clasificar** (`sin-clasificar.html`; `listado-procesos.html` es hoy una copia idéntica): bandeja, panel del correo y modal "Asignar a proceso". Sección 7.

Complementa la [guía de integración frontend](guia-integracion-frontend.md) (cliente HTTP, tokens, roles, errores) y la de [Dashboard e Identificación](integracion-dashboard-identificacion.md) (de ahí salen `apiBlob` y `messages.get`).

Para cada pantalla: llamadas, mapeo de cada elemento del diseño a su dato, lo que el diseño muestra y la API no tiene (quitar o adaptar) y los flujos de acción.

---

## 0. Tipos y cliente

Los tipos `CaseFiles`, `CaseFolder`, `CaseFolderItem`, `CaseFolderRef`, `CaseItemRef`, `CaseUpload`, `CaseTrash`, `CaseDetail`, `TenantUser`, `UPLOAD_ACCEPT` y `UPLOAD_MAX_BYTES` ya están en la guía general (§2.1). El cliente `caseFiles` también (§2.4). Añadir solo esto a `api/endpoints.ts`:

```ts
export const caseFiles = {
  // …lo de la guía general…
  // Mismo endpoint para abrir y descargar: siempre con Bearer y como blob, nunca con <a href> ni <iframe src>.
  content: (itemId: string) => apiBlob(`/case-files/items/${itemId}/content`),
};

export const auth = {
  // …
  users: () => api<T.TenantUser[]>('/users'),
};
```

Utilidades de la pantalla (puras, sin red):

```ts
// api/caseTree.ts
import type { CaseFolder, CaseFolderItem } from './types';

export function walk(folders: CaseFolder[], fn: (f: CaseFolder, parent: CaseFolder | null) => void, parent: CaseFolder | null = null) {
  for (const f of folders) { fn(f, parent); walk(f.children, fn, f); }
}

export function stats(folders: CaseFolder[]) {
  let carpetas = 0, documentos = 0, bytes = 0, ultimo: string | null = null;
  walk(folders, (f) => {
    carpetas++;
    for (const i of f.items) {
      documentos++;
      bytes += i.size_bytes ?? 0;                       // `cuerpo` no tiene tamaño
      if (!ultimo || i.created_at > ultimo) ultimo = i.created_at;
    }
  });
  return { carpetas, documentos, bytes, ultimo };
}

// Destinos válidos para mover una carpeta: no ella, no sus descendientes, y que el subárbol no pase del nivel 5.
export function subtreeHeight(f: CaseFolder): number {
  return 1 + Math.max(0, ...f.children.map(subtreeHeight));
}
export function canMoveFolderInto(moving: CaseFolder, target: CaseFolder | null): boolean {
  if (target) {
    let inside = false;
    walk([moving], (f) => { if (f.id === target.id) inside = true; });
    if (inside) return false;
  }
  const newDepth = (target?.depth ?? 0) + 1;
  return newDepth + subtreeHeight(moving) - 1 <= 5;
}

export const tipo = (i: CaseFolderItem): string =>
  i.kind === 'cuerpo' ? 'Cuerpo del correo'
  : ({ 'application/pdf': 'PDF', 'image/jpeg': 'JPG', 'image/png': 'PNG',
       'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
       'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel' } as Record<string, string>)[i.content_type ?? ''] ?? 'Archivo';
```

---

## 1. Carga

Ruta sugerida: `/cases/:caseId` con pestaña `?tab=expediente` (la otra pestaña es la línea de tiempo de la guía general §4.9).

```ts
const [caso, tree, users, me] = await Promise.all([
  cases.get(caseId),            // cabecera: radicado, estado, próximo vencimiento, providencias, mensajes_count, timeline
  caseFiles.tree(caseId),       // árbol completo (sin lo de la papelera)
  usersCache.get(),             // auth.users(), una vez por sesión: emails de uploaded_by
  meCache.get(),                // rol: decide si se muestran Eliminar y Papelera
]);
```

- `404` en `cases.get` o `caseFiles.tree` → "Proceso no encontrado" y volver al listado (no existe o es de otro tenant).
- Recargar `caseFiles.tree(caseId)` después de **cada** escritura que responda `2xx` (crear, renombrar, mover, subir, borrar, restaurar, asignar). Es una sola llamada y trae todo el árbol: no hay paginación.
- Selección inicial: la primera carpeta de la raíz. Guardar la carpeta seleccionada en la URL (`?folder=<id>`); si tras recargar ya no existe, volver a la primera.

---

## 2. Mapeo de elementos del diseño

### 2.1 Shell (menú lateral y cabecera)

| Elemento del diseño | Dato |
| --- | --- |
| Badge "Sin clasificar · 14" | `caseFiles.unassignedCount()` → `total`. Al arrancar, al volver a la pestaña y tras cada asignación. Ocultar el badge con `0` |
| Punto en "Alertas" | `alerts.unreadCount()` → `no_leidas > 0` |
| "Clínica San Rafael" | `GET /me` → `tenant.name` |
| Correo del usuario | `GET /me` → `email` |
| "Dra. M. Morales" | **Quitar**: no hay nombre de usuario, solo email |
| "Sede Central" | **Quitar**: no existen sedes |
| Selector "Rol: Owner/Admin/Member" | **Quitar**: el rol viene de `GET /me` → `role` |
| "Configuración", "Servicio activo · v2.4", "Legal Ops" | **Quitar** (no existen). Menú real: Dashboard, Bandeja de providencias, Procesos › Sin clasificar, Alertas, Conexiones de correo |

### 2.2 Banner de rol

| Elemento | Decisión |
| --- | --- |
| Banner "Expediente EXP-2024-8842 · Rol: Member · Vista de permisos…" y "Auditoría de borrado restringida" | **Quitar entero**. Era una nota del diseño. Para `member` simplemente no se pintan "Eliminar" ni "Papelera" |

### 2.3 Cabecera del proceso

| Elemento | Dato |
| --- | --- |
| "Radicado: 11001-40-03-014-2024-00984-00" | `caso.radicado` (23 dígitos sin separadores). Formatear en cliente: `5-2-2-3-4-5-2` → `11001-40-03-014-2024-00984-00`. Fuente monoespaciada |
| "EXP-2024-8842" | **Quitar**: no hay número interno de expediente; el identificador es el radicado |
| Badge "En Términos (24h)" | `caso.estado` → `por_vencer` "Por vencer" (ámbar), `en_termino` "En término" (verde), `vencido` "Vencido" (rojo), `respondido` "Respondido" (teal), `sin_termino` "Sin término" (gris). El "(24h)" sale de `caso.proximo_vencimiento` como tiempo relativo ("vence en 24 h"); sin vencimiento, nada |
| "Juzgado 14 Civil Municipal" | `caso.timeline` → `juzgado` de la providencia más reciente que lo tenga. Si ninguna lo tiene, ocultar |
| "Acción de Tutela en Salud" | **Quitar** o texto fijo "Tutela": la API no clasifica el tipo de acción |
| "Accionante: Clara Inés Restrepo P." | Opcional, una llamada más: `documents.list({ radicado: caso.radicado, document_status: 'extracted' }, null, 1)` → `items[0].fields.partes` con `rol: 'accionante'` → `nombre`. Sin resultado, ocultar la línea |
| "Paciente Oncológico (Suministro…)" | **Quitar**: no existe |
| Tarjeta "Documentos · 28 archivos" | `stats(tree.folders).documentos` (PDF de correo + cuerpos + subidos) |
| Tarjeta "Estructura · 6 carpetas" | `stats(tree.folders).carpetas` |
| Tarjeta "Último aporte · Hoy, 10:14" | `stats(tree.folders).ultimo` en hora de Bogotá; `null` → "—" |
| Tarjeta "Almacenamiento · 34.2 MB" | `stats(tree.folders).bytes` formateado (KB/MB). No incluye los cuerpos de correo |
| Panel "Cumplimiento probatorio 82%" y su barra | **Quitar** (no existe "verificado con firma digital del perito"). Si se quiere conservar el hueco: "Providencias respondidas", con `caso.timeline` → nº con `respuesta_estado === 'respondido'` sobre nº con `respuesta_estado !== 'no_requiere'`; sin ninguna con término, "—" |
| "Acceso delegado con retención de integridad" | **Quitar** |
| Chips "{n} providencias · {n} correos" (no están en el diseño, recomendados) | `caso.providencias`, `caso.mensajes_count` |

### 2.4 Barra de herramientas

| Elemento | Dato / acción |
| --- | --- |
| "Nueva carpeta" | Modal de nombre → `caseFiles.createFolder(caseId, nombre, carpetaSeleccionada?.id ?? null)`. Ver §3.1 |
| "Subir archivo" | Deshabilitado si no hay carpeta seleccionada (la raíz no admite archivos). Ver §3.4 |
| "Papelera" (falta en el diseño de member, correcto) | Solo `owner`/`admin`: botón de texto con icono de papelera → §3.6 |
| Buscador "Buscar providencia, orden…" | Filtro **en cliente** sobre `tree`: nombres de carpeta, `filename` y `correo.subject`. Placeholder: "Filtrar por nombre". No hay búsqueda en el servidor ni dentro del contenido |
| Botón "Descargar expediente ZIP" | **Quitar**: no hay descarga del expediente completo. Se descarga documento a documento |

### 2.5 Árbol de carpetas (panel izquierdo)

| Elemento | Dato |
| --- | --- |
| Título "Directorio judicial" · "6 items" | "Expediente" · `tree.folders.length` carpetas en la raíz (o `stats().carpetas`) |
| Fila de carpeta | `walk(tree.folders)`; sangría por `depth` (1-5). El diseño solo pinta un nivel: **añadir** desplegar/plegar para `children` |
| Icono | `origen === 'correo'` → icono de correo (`mail`); `'manual'` → `folder` / `folder_open` si está seleccionada |
| Nombre "01. Demanda y Traslado" | `folder.name`. Las de correo son `YYYY-MM-DD HH:mm — asunto`: truncar con tooltip |
| "8 doc" | `folder.items.length` (solo los documentos directos de esa carpeta) |
| Punto ámbar de conflicto (no está en el diseño) | **Añadir** si `folder.correo?.radicado_conflicto` |
| Menú ⋯ | §2.7 |
| Nota "Los miembros pueden crear subdirectorios…" | Sustituir por: "Los documentos que llegaron por correo no se pueden eliminar; puedes moverlos y crear carpetas." |
| Arrastrar y soltar (no está en el diseño) | Opcional: soltar una carpeta → `patchFolder(id, { parent_id })`; un documento → `patchItem(id, { folder_id })`. Destinos inválidos con `canMoveFolderInto`; un documento nunca en la raíz |

### 2.6 Contenido de la carpeta (panel derecho)

| Elemento | Dato |
| --- | --- |
| Título "01. Demanda y Traslado" | `carpeta.name` + ruta (breadcrumb) con los padres |
| "8 elementos" | `carpeta.children.length + carpeta.items.length` |
| Cabecera del correo (no está en el diseño) | **Añadir** si `carpeta.correo`: Remitente (`sender`), Asunto (`subject`), Recibido (`received_at`, Bogotá), "Radicado detectado en: …" (`radicado_source`: `pdf_revisado` "PDF revisado", `pdf` "PDF", `asunto` "asunto", `cuerpo` "cuerpo", `manual` "asignación manual") y botón "Mover a otro proceso" (§3.5). Si `radicado_conflicto`: aviso ámbar "El correo menciona otro radicado; revisa que esté en el proceso correcto." |
| Subcarpetas (no están en el diseño) | **Añadir** como filas arriba de la tabla (`carpeta.children`); clic → seleccionar |
| Orden "Fecha (recientes)" | En cliente sobre `created_at`. La API ya los manda por `created_at` ascendente |
| Columna "Nombre de archivo" | `item.filename`; para `cuerpo` (`filename: null`) → "Cuerpo del correo" |
| Icono | `tipo(item)`: PDF `picture_as_pdf`, Word/Excel `description`, imagen `image`, cuerpo `notes` |
| Subtítulo "Hash: e9b4…28f1 (Autenticado)" | **Quitar**: el árbol no expone el `sha256` ni hay autenticación de documentos |
| Subtítulo "Subido por: mmorales (Member)" | `kind === 'subido'` → `users.find(u => u.id === item.uploaded_by)?.email ?? 'Usuario eliminado'`. Para `adjunto`/`cuerpo`: "Del correo" |
| Subtítulo "Generación asistida AI", "Firma de recibido farmacia" | **Quitar**: no hay generación de documentos ni descripciones |
| Columna "Formato / Peso" | `tipo(item)` + `size_bytes` formateado; `cuerpo` → solo "Texto" |
| Columna "Fecha aporte" | `item.created_at` (hora de Bogotá) |
| Columna "Estado" (Notificado / En revisión / Editable / Cotejado) | **Sustituir** por "Origen": `adjunto`/`cuerpo` → badge gris "Correo"; `subido` → badge teal "Subido". No existen esos estados |
| Enlace a la providencia (recomendado) | Para `kind === 'adjunto'`: acción "Ver identificación" → `/documents/{item.attachment_id}` (pantalla de Identificación del proceso) |
| Paginación "1 / 2" y "Mostrando 4 de 8" | **Quitar**: el árbol llega completo. Si una carpeta tiene muchos documentos, paginar en cliente |
| "Protección de trazabilidad estricta" | Sustituir por: "Los archivos subidos no generan vencimientos ni aparecen en Documentos." |
| Carpeta vacía | "Esta carpeta está vacía." + "Subir archivo" |

### 2.7 Menús contextuales

Carpeta:

| Opción | Visible | Acción |
| --- | --- | --- |
| Nueva subcarpeta | todos; oculta si `depth === 5` | §3.1 con `parent_id = carpeta.id` |
| Renombrar | todos (también carpetas de correo) | §3.2 |
| Mover a… | todos | §3.3 |
| Subir archivo aquí | todos | §3.4 |
| Eliminar (falta en el diseño de admin) | `owner`/`admin` **y** `origen === 'manual'` | §3.6 |

Documento:

| Opción | Visible | Acción |
| --- | --- | --- |
| Abrir | todos | §3.7 (visor) |
| Descargar | todos | §3.7 |
| Mover a… | todos | §3.3 |
| Renombrar | solo `kind === 'subido'` | §3.2. En `adjunto`/`cuerpo` no mostrarla: el nombre original es evidencia |
| Ver identificación (añadir) | solo `kind === 'adjunto'` | navegar a `/documents/{attachment_id}` |
| Eliminar (falta en el diseño de admin) | `owner`/`admin` **y** `kind === 'subido'` | §3.6 |

Para `member` el diseño ya es correcto: sin "Eliminar" y sin "Papelera". Los `alert()` del prototipo se sustituyen por los modales de §3.

---

## 3. Flujos

Errores: los códigos se traducen con el mapa de la guía general §5. Tras cada `2xx`: toast + `caseFiles.tree(caseId)`.

### 3.1 Nueva carpeta

Modal con "Nombre" (1-120 caracteres, recortar espacios) y la ruta destino en gris ("En: Expediente / Contestaciones").

```ts
await caseFiles.createFolder(caseId, nombre.trim(), parentId);  // 201 CaseFolderRef
```

| Respuesta | UI |
| --- | --- |
| `201` | Toast "Carpeta creada"; seleccionar la nueva (`ref.id`) |
| `409 folder_name_taken` | En el campo: "Ya existe una carpeta con ese nombre en este nivel." (sin distinguir mayúsculas) |
| `422 folder_too_deep` | "Superaría el máximo de 5 niveles." (no debería pasar si se oculta la opción en `depth === 5`) |
| `404` | La carpeta padre ya no existe: recargar el árbol |

### 3.2 Renombrar

- Carpeta: `caseFiles.patchFolder(id, { name })` → `409 folder_name_taken` como en §3.1.
- Archivo subido: `caseFiles.patchItem(id, { name })` (1-200). Mostrar la extensión fija y editar solo la base. `422 item_not_renamable` si se intenta en un documento de correo.

### 3.3 Mover a…

Modal con un árbol del **mismo** proceso.

- Carpeta: primera opción "Raíz del expediente" (`parent_id: null`). Deshabilitar los destinos con `!canMoveFolderInto(carpeta, destino)` y tooltip "No puedes mover una carpeta dentro de sí misma" / "Superaría 5 niveles". → `caseFiles.patchFolder(id, { parent_id })`.
- Documento: sin opción de raíz. → `caseFiles.patchItem(id, { folder_id })`.

| Error | Texto |
| --- | --- |
| `422 folder_cycle` | No puedes mover una carpeta dentro de sí misma. |
| `422 folder_too_deep` | Superaría el máximo de 5 niveles. |
| `422 folder_other_case` | Solo puedes mover dentro del mismo proceso. |
| `409 folder_name_taken` | Ya existe una carpeta con ese nombre en el destino. |

### 3.4 Subir archivos

`<input type="file" multiple accept={UPLOAD_ACCEPT}>` o soltar archivos sobre el panel derecho. Destino: la carpeta seleccionada (o la del menú "Subir archivo aquí").

```ts
for (const file of files) {                                  // uno por petición, en serie
  if (file.size > UPLOAD_MAX_BYTES) { fila.error('El archivo supera 25 MB'); continue; }
  try { await caseFiles.upload(folderId, file); fila.ok(); }
  catch (e) { fila.error(texto((e as ApiError).code)); }
}
await caseFiles.tree(caseId);                                // una recarga al final
```

| Respuesta | Texto en la fila |
| --- | --- |
| `201` | Subido ✓ |
| `413 upload_too_large` | El archivo supera 25 MB |
| `415 unsupported_upload_type` | Solo PDF, Word (.docx), Excel (.xlsx), JPG o PNG; el contenido debe coincidir con la extensión |
| `422 invalid_upload` | El archivo está vacío o no se pudo leer |
| `503 blob_store_unavailable` | No se pudo guardar el archivo. Intenta más tarde. (botón "Reintentar") |
| `404` | La carpeta ya no existe: cerrar el modal y recargar |

`fetch` no da progreso de subida: para la barra de progreso usar `XMLHttpRequest` con `upload.onprogress` y el mismo `Authorization: Bearer`, o una barra indeterminada.

### 3.5 Mover el correo a otro proceso

Desde la cabecera de una carpeta de correo. Modal con "Radicado":

```ts
const r = normalizar(input);                                   // quitar separadores; 23 dígitos
const found = (await cases.list({ radicado: r, limit: 1 })).items[0];   // GET /cases?radicado=…
// found → "Asignar a este proceso" con { case_id: found.id }; si no → "Crear proceso y asignar" con { radicado: r }
await caseFiles.assign(carpeta.correo.message_id, found ? { case_id: found.id } : { radicado: r });
```

- `cases.list` de la guía general no tiene `radicado`: añadirlo (`radicado?: string` → `q.set('radicado', …)`); la API ya lo admite y acepta separadores.
- `422 invalid_radicado` (en la búsqueda o al asignar) → "El radicado no es válido".
- Aviso en el modal: "Las subcarpetas y archivos que agregaste dentro de esta carpeta se quedan en el proceso actual." y "Después de asignarlo a mano, el sistema no lo volverá a mover automáticamente."
- Tras `200`: recargar este árbol (la carpeta desaparece; lo añadido a mano queda en la raíz y en "Archivos de <carpeta>"), recargar `unassignedCount()` y ofrecer "Ir al proceso" (`/cases/{case_id}`).

### 3.6 Eliminar y papelera (solo owner/admin)

- **Eliminar carpeta** (`origen: 'manual'`): confirmar "Se moverá a la papelera con todo su contenido." → `caseFiles.deleteFolder(id)` → `204`. Si responde `409 folder_has_mail_content`: diálogo "La carpeta contiene correos o documentos de correo. Muévelos fuera antes de eliminarla." con solo "Entendido".
- **Eliminar archivo** (`kind: 'subido'`): confirmar "Se moverá a la papelera. Un administrador puede restaurarlo." → `caseFiles.deleteItem(id)`. `409 item_from_mail` no debería verse (la opción está oculta).
- **Papelera**: `caseFiles.trash(caseId)`.
  - Filas: `folders` e `items`, de `deleted_at` más reciente a más antiguo. Agrupar bajo una carpeta las subcarpetas con el mismo `deleted_at` y `deleted_by` cuyo `parent_id` está en la papelera; "Restaurar" solo en la de arriba.
  - "Eliminado por": `deleted_by` → email con `auth.users()`.
  - "Ubicación original": nombre del padre (`parent_id` o `folder_id`) buscado en el árbol o en la propia papelera; sin padre → "Raíz".
  - Restaurar: `caseFiles.restoreFolder(id)` / `caseFiles.restoreItem(id)`. Si la carpeta vuelve con `parent_id: null` y antes tenía padre, avisar "Su carpeta original está en la papelera; se restauró en la raíz". `409 folder_name_taken` → "Ya hay una carpeta con ese nombre; renómbrala antes de restaurar". `409 item_folder_deleted` → "Restaura primero la carpeta del archivo".
  - Vacía: "La papelera está vacía."
- Un `403` (rol cambiado con la sesión abierta) → recargar `GET /me` y ocultar las acciones.

### 3.7 Abrir y descargar

```ts
const blob = await caseFiles.content(item.id);   // GET /case-files/items/{id}/content
```

| `kind` / tipo | Abrir (visor lateral) | Descargar |
| --- | --- | --- |
| `adjunto` (PDF) | Visor PDF propio (p. ej. pdf.js) desde el `blob`. La lectura queda auditada | `URL.createObjectURL(blob)` + `<a download={filename}>` temporal |
| `cuerpo` | `await blob.text()` en un `<pre>` con `white-space: pre-wrap`, escapado. Nunca como HTML | Igual, nombre `cuerpo-del-correo.txt` |
| `subido` JPG/PNG | `<img src={URL.createObjectURL(blob)}>`, nunca `<iframe>` | Igual |
| `subido` PDF | Igual que `adjunto` | Igual |
| `subido` Word/Excel | Sin vista previa: "Este tipo de archivo no se previsualiza." + "Descargar". No abrirlos en el navegador (no hay antivirus, SPEC 17) | Igual |

- `URL.revokeObjectURL` al cerrar el visor.
- `404` → "El documento ya no existe" y recargar el árbol. `503 blob_store_unavailable` → "No se pudo abrir el archivo. Intenta más tarde."

---

## 4. Estados vacíos y carga

- Cargando: esqueleto en las tarjetas, el árbol y la tabla. No bloquear la cabecera si `cases.get` llega antes que el árbol.
- Proceso sin carpetas (`tree.folders` vacío; p. ej. un caso anterior a SPEC 19 si no se ejecutó `case-files-rebuild`): "Este proceso aún no tiene documentos." + "Nueva carpeta".
- Filtro sin resultados: "Ningún elemento coincide con el filtro." + "Limpiar".

---

## 5. Referencia rápida de endpoints del Expediente

| Uso | Endpoint | Rol |
| --- | --- | --- |
| Cabecera | `GET /cases/{id}` | todos |
| Árbol | `GET /cases/{id}/files` | todos |
| Accionante (opcional) | `GET /documents?radicado=…&document_status=extracted&limit=1` | todos |
| Emails de autores | `GET /users` | todos |
| Rol, tenant, email | `GET /me` | todos |
| Badge "Sin clasificar" | `GET /case-messages/unassigned/count` | todos |
| Crear carpeta | `POST /cases/{id}/folders` | todos |
| Renombrar / mover carpeta | `PATCH /case-folders/{id}` | todos |
| Subir | `POST /case-folders/{id}/uploads` | todos |
| Renombrar / mover documento | `PATCH /case-files/items/{id}` | todos |
| Abrir / descargar | `GET /case-files/items/{id}/content` | todos |
| Buscar proceso destino | `GET /cases?radicado=…&limit=1` | todos |
| Mover correo de proceso | `PUT /case-messages/{message_id}/case` | todos |
| Eliminar carpeta / documento | `DELETE /case-folders/{id}`, `DELETE /case-files/items/{id}` | admin |
| Papelera | `GET /cases/{id}/trash` | admin |
| Restaurar | `POST /case-folders/{id}/restore`, `POST /case-files/items/{id}/restore` | admin |

Todas responden `Cache-Control: no-store`. Nombres de carpeta y archivo, asunto, remitente y radicado son datos del proceso: no mandarlos a analítica ni a logs del cliente.

---

## 6. Elementos del diseño sin respaldo en la API

| Elemento | Decisión |
| --- | --- |
| Selector de rol, banner "Vista de permisos de rol" | El rol viene del token (`GET /me`) |
| "EXP-2024-8842" | Solo radicado |
| "Acción de Tutela en Salud", "Paciente oncológico…" | No existen |
| Nombre del usuario ("Dra. M. Morales"), sede | Solo email y nombre del tenant |
| "Cumplimiento probatorio 82%" | No existe; alternativa "Providencias respondidas" desde `timeline` |
| Hash "Autenticado", "Generación asistida AI", descripciones de archivo | No existen |
| Estados de documento (Notificado, En revisión, Editable, Cotejado) | Columna "Origen" (Correo / Subido) |
| Descargar expediente ZIP | No existe; descarga por documento |
| Paginación de la tabla | El árbol llega completo |
| Búsqueda de "providencia, orden" en contenido | Solo filtro por nombre en cliente |
| Configuración, "Servicio activo v2.4" | No existen |

Faltan en el diseño y hay que añadirlos: cabecera de carpeta de correo con aviso de conflicto y "Mover a otro proceso", subcarpetas anidadas, icono distinto para carpetas de correo, "Eliminar" y "Papelera" en la vista admin, visor de documento, modales de §3 (en lugar de los `alert()` del prototipo).

---

## 7. Pantalla: Sin clasificar

Ruta sugerida: `/procesos/sin-clasificar`. Correos descargados en los que no se encontró radicado; cada uno se asigna a mano a un proceso.

### 7.1 Carga

```ts
const [page, count, conns] = await Promise.all([
  caseFiles.unassigned(null, 50),        // primera página, del más reciente al más antiguo
  caseFiles.unassignedCount(),           // { total, adjuntos }: tarjetas y badge del menú
  integrations.list(),                   // "Último sync de correo"
]);
```

- "Cargar más": `caseFiles.unassigned(page.next_cursor)` y concatenar; ocultar el botón con `next_cursor: null`. `422 invalid_cursor` → recargar desde el principio.
- "Actualizar": repetir las tres llamadas. Sondear `unassignedCount()` cada 1-2 min con la pestaña visible (como las alertas); si `total` cambia, mostrar "Hay correos nuevos · Actualizar" en vez de reordenar la tabla bajo el usuario.

### 7.2 Mapeo de elementos

| Elemento del diseño | Dato |
| --- | --- |
| Breadcrumb "Operación Legal / Buzón de excepciones" | "Procesos / Sin clasificar" |
| Título y subtítulo | Fijos. Subtítulo: "Correos descargados en los que no se encontró un radicado de 23 dígitos." |
| Selector "Modo demo: Lista & Drawer / Estado vacío / Modal Asignar" y botones "Demo Existente / Demo Nuevo" | **Quitar**: son controles del prototipo |
| Tarjeta "Pendientes por radicar · 8 correos" | `count.total` |
| Tarjeta "Adjuntos pendientes · 14 PDFs" | `count.adjuntos` (PDF guardados de todos los correos sin clasificar, no solo de la página cargada) |
| Tarjeta "Último sync de correo · Hace 4 min" | Máximo de `last_sync_at` entre `conns` con `status === 'active'`, en tiempo relativo. Sin ninguno → "—" |
| Buscador | Filtro **en cliente** por `sender` y `subject` sobre lo ya cargado. Si hay `next_cursor`, avisar "Filtra solo los correos cargados" |
| "Mostrando 8 de 8" | `filtrados.length` de `count.total` |
| Columna "Remitente" (nombre + email + icono juzgado/persona) | `item.sender` es **solo la dirección de correo** (en minúsculas): quitar la línea del nombre. El icono `gavel` puede decidirse en cliente por dominio (`ramajudicial.gov.co`, `notificacionesjudiciales.gov.co`); si no, `person` |
| Columna "Asunto" | `item.subject` (una línea, truncado; `null` → "(sin asunto)") |
| Columna "Recibido (Bogotá)" | `item.received_at` en `America/Bogota`, `dd/mm/yyyy HH:mm`; `null` → "—" |
| Columna "Adjuntos · 2 PDFs" | `item.attachments` (`0` → "—") |
| Botón "Asignar a proceso" | §7.4 con la fila |
| Clic en la fila | §7.3 |
| "Paginación por cursor activo: cursor_token_08c7" | **Quitar**: el cursor no se muestra |
| Estado vacío "No hay correos sin clasificar" | Cuando `count.total === 0`. Texto: "Todos los correos descargados están en un proceso." |
| "Ver bandeja completa" | Navegar a la Bandeja de providencias (`/documents`) |
| "Sincronizar ahora" | Solo owner/admin: `POST /email-integrations/{id}/sync` por cada conexión `active` (guía general §4.6). Para member, ocultar |

### 7.3 Panel del correo (drawer)

```ts
const msg = await messages.get(item.connection_id, item.message_id);  // GET /email-integrations/{connection_id}/messages/{message_id}
```

| Elemento | Dato |
| --- | --- |
| Aviso "Sin radicado detectado" | Fijo |
| Asunto | `msg.subject` |
| Fecha | `msg.received_at` (Bogotá) |
| Remitente (nombre + email) | `msg.sender` (solo email) |
| Icono `account_balance` con juzgado | **Quitar**: el correo no trae juzgado (solo sale de la extracción del PDF) |
| "Contenido del mensaje" | `msg.body_text` en `<pre>` con `white-space: pre-wrap`, como texto (nunca `body_html`). `body_truncated: true` → nota "Contenido recortado". `null` → "El correo no tiene texto plano." |
| "Copiar texto" | `navigator.clipboard.writeText(msg.body_text)` |
| "Archivos adjuntos (n)" | `msg.attachments`: `filename` y `size_bytes` formateado. `attachments_skipped > 0` → "{n} adjuntos no PDF no se guardaron" |
| "Verificado virus" | **Quitar**: no hay antivirus (SPEC 17) |
| "Descargar" | ``apiBlob(`${EI}/${item.connection_id}/messages/${item.message_id}/attachments/${a.id}`)`` → `<a download>` temporal. La descarga queda auditada |
| "Ver identificación" (recomendado) | Si `a.document_status === 'extracted'`: enlace a `/documents/{a.id}`. Ahí se puede corregir el radicado del PDF, y al guardarlo el correo se agrupa solo, sin asignación manual |
| "Acción requerida para archivar" + "Asignar a proceso" | Título "Asignar a un proceso" + botón → §7.4 |

`404` en `messages.get` → el correo ya no existe o es de otro tenant: cerrar el panel y recargar la bandeja.

### 7.4 Modal "Asignar a proceso"

Encabezado con remitente, fecha y asunto de la fila. Campo "Número de radicado" con contador "n/23 dígitos" (el diseño quita los no-dígitos al escribir; la API también acepta separadores).

Al completar 23 dígitos (con *debounce* de 300 ms):

```ts
let found: CaseSummary | undefined;
try {
  found = (await cases.list({ radicado: digits, limit: 1 })).items[0];   // GET /cases?radicado=…
} catch (e) {
  if ((e as ApiError).code === 'invalid_radicado') return estado('invalido');
  throw e;
}
estado(found ? 'existente' : 'nuevo');
```

| Estado del diseño | Cuándo | Contenido | Botón |
| --- | --- | --- | --- |
| Indicación inicial | 0 dígitos | Texto de ayuda con el formato | deshabilitado |
| "Faltan n dígitos…" | 1-22 dígitos | "Faltan {23 − n} dígitos" | deshabilitado |
| "El radicado no es válido" | 23 dígitos y `422 invalid_radicado` (estructura o año imposibles) | "El radicado no es válido" | deshabilitado |
| Existente | `found` | `found.radicado` formateado, badge con `found.estado` (en lugar de "En trámite"), "{found.mensajes_count} correos vinculados". "Accionante: …" es opcional (§2.3) | "Asignar a este proceso" |
| Nuevo | sin resultados | "No existe un proceso con este radicado. Se creará uno nuevo." | "Crear proceso y asignar" |

Confirmar:

```ts
const link = await caseFiles.assign(item.message_id, found ? { case_id: found.id } : { radicado: digits });
```

| Respuesta | UI |
| --- | --- |
| `200` | Cerrar modal y panel, quitar la fila, recargar `unassignedCount()`, toast "Correo asignado al proceso {radicado}" con enlace "Ver proceso" → `/cases/{link.case_id}` |
| `422 invalid_radicado` | Estado inválido en el campo |
| `404 "Correo no encontrado"` | Ya no existe: toast y recargar la bandeja |
| `404 "Caso no encontrado"` | El proceso desapareció entre la búsqueda y la confirmación: repetir la búsqueda |

Si otro usuario asignó el correo mientras tanto, la asignación igual funciona (pasa a ser una reasignación manual): tras el `200`, recargar la bandeja.

Bloque "Reglas de reasignación manual": aquí mostrar solo "Después de asignarlo a mano, el sistema no lo volverá a mover automáticamente." La línea "Las subcarpetas y archivos que agregaste…" es del Expediente (§3.5): un correo sin clasificar aún no tiene carpeta.

### 7.5 Endpoints de esta pantalla

| Uso | Endpoint | Rol |
| --- | --- | --- |
| Tabla | `GET /case-messages/unassigned?limit&cursor` | todos |
| Tarjetas y badge | `GET /case-messages/unassigned/count` → `{total, adjuntos}` | todos |
| Último sync | `GET /email-integrations` | todos |
| Panel del correo | `GET /email-integrations/{connection_id}/messages/{message_id}` | todos |
| Descargar PDF | `GET /email-integrations/{connection_id}/messages/{message_id}/attachments/{attachment_id}` | todos |
| Buscar proceso | `GET /cases?radicado=…&limit=1` | todos |
| Asignar | `PUT /case-messages/{message_id}/case` | todos |
| Sincronizar ahora | `POST /email-integrations/{id}/sync` | admin |

### 7.6 Elementos sin respaldo en la API

| Elemento | Decisión |
| --- | --- |
| Nombre del remitente ("Juzgado 14 Laboral…") | Solo email |
| Juzgado en el panel del correo | No existe para un correo sin providencia identificada |
| "Verificado virus" | No hay antivirus |
| Cursor visible, controles de demo | Quitar |
| "En trámite" | Estado real del caso (`estado`) |
| "Este correo será el primer auto registrado" | Quitar: asignar no crea providencias |