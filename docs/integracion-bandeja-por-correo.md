# Integración frontend: bandeja por correo y correos del caso

Commit `e6a8f0d`. Cambios que el frontend debe hacer para que:

1. La **bandeja de providencias** funcione como una bandeja de correo: **una fila por correo**, aunque traiga 2, 3 o más documentos.
2. Al abrir un correo se vea el **detalle de extracción de cada documento** que trajo.
3. El **caso (proceso)** muestre **todos los correos** de su radicado y cada uno lleve a su detalle.

Navegación:

```
Bandeja (GET /messages) ───────┐
                               ├──► Detalle del correo (GET /messages/{message_id})
Caso (GET /cases/{id})         │       └─ documentos_detalle[]: todo lo extraído de cada PDF
  ├─ mensajes[] ───────────────┘
  └─ timeline[].message_id ────┘
```

---

## 1. Regla de negocio que cambia (backend, ya aplicada)

**Un correo = un proceso.** Todos los documentos de un correo quedan en el caso del correo, traigan radicado o no.

- Antes, un PDF sin radicado quedaba sin caso (o en otro proceso si traía otro número). Eso ya no pasa.
- Si un documento trae un radicado **distinto** al del correo, sigue en el caso del correo y el correo queda con `caso.radicado_conflicto: true`. Hay que mostrar un aviso para revisar la asignación.
- Reasignar el correo (`PUT /case-messages/{message_id}/case`, sin cambios) mueve **todos** sus documentos.
- El filtro `radicado` de `GET /documents` ahora también devuelve los documentos sin radicado propio que pertenecen al caso.

El frontend no tiene que hacer nada para esto, pero ya no debe asumir que `documento.case_id` sale del radicado del propio documento.

---

## 2. Tipos nuevos (TypeScript)

```ts
// Caso del correo. Todo null (y radicado_conflicto false) = correo sin clasificar.
export interface InboxMessageCase {
  case_id: string | null;
  radicado: string | null;
  radicado_source: 'pdf_revisado' | 'pdf' | 'asunto' | 'cuerpo' | 'manual' | null;
  radicado_conflicto: boolean; // true → mostrar aviso "Radicados distintos: revisar"
}

// Resumen de cada documento dentro de la fila del correo.
export interface InboxDocumentSummary {
  attachment_id: string;
  filename: string;               // texto no confiable: mostrar escapado
  document_status: 'pending' | 'failed' | 'extracted' | 'needs_ocr';
  review_status: 'unreviewed' | 'confirmed' | 'corrected';
  clase_providencia: string | null;
  vence_at: string | null;        // ISO 8601
  respuesta_estado: 'no_requiere' | 'pendiente' | 'vencido_sin_respuesta' | 'respondido';
}

// Una fila de la bandeja = un correo.
export interface InboxMessage {
  message_id: string;
  connection_id: string;
  correo: MessageOrigin;          // { remitente, asunto, recibido_at }: el mismo tipo que en /documents
  caso: InboxMessageCase;
  documentos_count: number;       // 0 si el correo no trae PDF (solo pasa en el caso, nunca en la bandeja)
  // Agregados: el peor estado entre sus documentos. null si documentos_count === 0.
  document_status: 'pending' | 'failed' | 'needs_ocr' | 'extracted' | null;
  review_status: 'unreviewed' | 'corrected' | 'confirmed' | null;
  respuesta_estado: 'vencido_sin_respuesta' | 'pendiente' | 'respondido' | 'no_requiere' | null;
  proximo_vencimiento: string | null; // menor vence_at de los documentos pendientes de respuesta
  sugerido_ia: boolean;               // algún documento con campos sugeridos por el LLM
  documentos: InboxDocumentSummary[];
}

export interface InboxMessagePage {
  items: InboxMessage[];
  next_cursor: string | null;
}

// Detalle del correo: lo mismo más el detalle completo de cada documento.
export interface InboxMessageDetail extends InboxMessage {
  // Mismo orden que `documentos`. Cada elemento es EXACTAMENTE el objeto de GET /documents/{id}
  // (fields con confianza y página, llm_fields, llm_model, analysis, respuestas, last_review, vence_at…).
  documentos_detalle: DocumentDetail[];
}
```

Prioridad de los agregados (de peor a mejor):

| Campo | Orden |
|---|---|
| `document_status` | `pending` > `failed` > `needs_ocr` > `extracted` |
| `review_status` | `unreviewed` > `corrected` > `confirmed` |
| `respuesta_estado` | `vencido_sin_respuesta` > `pendiente` > `respondido` > `no_requiere` |

### Cambios en tipos existentes

```ts
export interface CaseTimelineEntry {
  attachment_id: string;
  message_id: string;   // NUEVO: correo que trajo el documento → GET /messages/{message_id}
  // …resto sin cambios
}

export interface CaseDetail extends Case {
  timeline: CaseTimelineEntry[];
  mensajes: InboxMessage[]; // NUEVO: todos los correos del radicado, el más reciente primero
}
```

---

## 3. Endpoints nuevos

Todos los roles (`owner`, `admin`, `member`). Respuestas con `Cache-Control: no-store`.

| Método y ruta | Respuesta | Errores |
|---|---|---|
| `GET /messages?limit&cursor&radicado&clase&fecha_desde&fecha_hasta&document_status&review_status&confianza_baja&sugerido_ia` | `200 InboxMessagePage` | `422 invalid_cursor`, `422 invalid_radicado`, `422` (filtro inválido) |
| `GET /messages/{message_id}` | `200 InboxMessageDetail` | `404` (no existe, es de otro tenant o no está descargado) |

`GET /messages`:
- Orden: fecha de recepción del correo, la más reciente primero (como un buzón).
- `limit` entre 1 y 100 (por defecto 50). Paginación por `next_cursor`, igual que `/documents`.
- **Filtros:** los mismos de `/documents`. Un correo aparece si **alguno** de sus documentos cumple el filtro, y la fila trae **todos** sus documentos en `documentos`, cumplan o no.
- Solo lista correos que traen documentos con procesamiento. Los correos sin PDF no salen en la bandeja (sí en el caso, ver §4.3).

```ts
export const inbox = {
  list: (params: Record<string, string | number | boolean | undefined> = {}) => {
    const q = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]),
    );
    return api<T.InboxMessagePage>(`/messages?${q}`);
  },
  get: (messageId: string) => api<T.InboxMessageDetail>(`/messages/${messageId}`),
};
```

---

## 4. Cambios por pantalla

### 4.1 Bandeja de providencias → por correo

**Antes:** `documents.list()` mostraba una fila por PDF.
**Ahora:** usar `inbox.list()`, con una fila por correo.

Columnas sugeridas por fila:

| Columna | Dato |
|---|---|
| Remitente / asunto | `correo.remitente`, `correo.asunto` (escapados) |
| Recibido | `correo.recibido_at` |
| Radicado | `caso.radicado` o la etiqueta "Sin clasificar" si es `null`; icono de aviso si `caso.radicado_conflicto` |
| Adjuntos | `documentos_count` (p. ej. un clip con "3"), con tooltip de `documentos[].filename` |
| Estado | `document_status` y `review_status` agregados (p. ej. "Por revisar" si `unreviewed`) |
| Vencimiento | `proximo_vencimiento` + `respuesta_estado` |
| IA | marca si `sugerido_ia` |

- **Clic en la fila:** navegar a `/bandeja/{message_id}` (o la ruta que use el frontend) → §4.2.
- **Filtros y tarjetas del dashboard:** los mismos parámetros que antes iban a `/documents` ahora van a `/messages`. Ojo: el dashboard **cuenta documentos** (`documentos.sin_revisar`, etc.), mientras que la bandeja muestra **correos**. Al hacer clic en una tarjeta, la bandeja puede tener menos filas que el número de la tarjeta si un correo trae varios documentos. Conviene un texto como "12 documentos en 9 correos", o dejar la tarjeta apuntando a `/documents`.

### 4.2 Detalle del correo (pantalla nueva o reutilizada)

`inbox.get(message_id)`.

- **Cabecera:** remitente, asunto, fecha, caso (enlace a `/cases/{caso.case_id}` si existe; si es `null`, la acción "Asignar a caso" con `PUT /case-messages/{message_id}/case`), aviso de conflicto.
- **Cuerpo:** una sección o pestaña por elemento de `documentos_detalle`, en ese orden. Cada sección es la vista de "Identificación del proceso" que hoy se arma con `GET /documents/{id}`: campos con confianza y página, sugeridos por IA (`llm_fields`), análisis (`analysis`), vencimiento, respuestas. **No hace falta llamar a `/documents/{id}` por cada documento**: ya viene todo.
- **Acciones por documento** (sin cambios, siguen en `/documents`):
  - Revisar/corregir: `PATCH /documents/{attachment_id}/extraction`.
  - Texto por página: `GET /documents/{attachment_id}/text`.
  - Descargar PDF: `GET /email-integrations/{connection_id}/messages/{message_id}/attachments/{attachment_id}`.
  - Registrar/anular respuesta: `POST /documents/{attachment_id}/response[/void]`.
  - Después de una acción, recargar `inbox.get(message_id)`: corregir el radicado de un documento puede cambiar el caso del correo y sus agregados.
- **Correo sin documentos** (`documentos_detalle: []`): mostrar la cabecera y un texto como "Este correo no trae documentos; se asoció al caso por el radicado del asunto/cuerpo" (según `caso.radicado_source`).

### 4.3 Detalle del caso (proceso)

`cases.get(case_id)` ahora trae `mensajes`:

- Agregar una sección **"Correos del proceso"** con la lista `mensajes` (más reciente primero), con las mismas columnas que la bandeja. **Clic → detalle del correo (§4.2).**
- Ahí salen también los correos **sin PDF** (agrupados por el asunto o el cuerpo): `documentos_count: 0` y agregados `null`. Mostrar "Sin adjuntos" en vez de los estados.
- En la **línea de tiempo**, cada entrada trae `message_id`: añadir el enlace "Ver correo" → §4.2.
- `mensajes_count` del caso coincide con `mensajes.length`.

### 4.4 Alertas y enlaces

Sin cambios obligatorios. Las alertas siguen llevando a `/cases/{case_id}` o a `/documents/{attachment_id}`. Si el frontend reemplaza la vista de documento por la de correo, desde `/documents/{attachment_id}` puede redirigir a `/messages/{message_id}` (el `message_id` viene en `GET /documents/{id}`) y abrir la sección de ese documento.

---

## 5. Checklist

- [ ] Tipos `InboxMessage*` y los campos nuevos `CaseDetail.mensajes` y `CaseTimelineEntry.message_id`.
- [ ] La bandeja usa `GET /messages`: una fila por correo, con contador de adjuntos.
- [ ] El clic en un correo abre el detalle con una sección por documento (`documentos_detalle`).
- [ ] Acciones de revisión, texto, PDF y respuesta por documento desde el detalle del correo; recargar al terminar.
- [ ] Aviso visible si `caso.radicado_conflicto`.
- [ ] Caso: sección "Correos del proceso" (`mensajes`) con enlace a cada correo; "Ver correo" en la línea de tiempo.
- [ ] Correos sin adjuntos: estados `null` → "Sin adjuntos".
- [ ] Textos del correo (remitente, asunto, nombres de archivo) siempre escapados.
- [ ] `422 invalid_cursor` → recargar sin cursor; `404` en el detalle → volver a la bandeja.
