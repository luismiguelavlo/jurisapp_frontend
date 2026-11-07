# Integración: Ficha del caso y entidad del tenant (SPEC 21)

Cómo actualizar el frontend con lo que agregó el [SPEC 21](../specs/21-ficha-del-caso.md):

- **Ficha del caso** (`GET`/`PUT /cases/{id}/ficha`): accionante, objeto, resumen de hechos, pretensiones, diagnósticos, tecnologías, antecedentes, reclamos previos, medida provisional y **cada actuación del despacho** con su término, a quién va dirigida y si le exige respuesta a la entidad. Secciones 1–5.
- **Análisis por documento** (campo nuevo `analysis` en `GET /documents/{id}`). Sección 6.
- **Entidad del tenant** (`/tenant/entity-names` y `/tenant/entity-names/deteccion`): con qué nombres aparece la entidad en los documentos; la app también la detecta sola. Sección 7.

Complementa la [guía de integración frontend](guia-integracion-frontend.md) (cliente HTTP `api`, `ApiError`, tokens, roles, errores) y la de [Procesos](integracion-procesos.md) (expediente del caso, de donde sale `apiBlob` para abrir el PDF de una fuente).

**Nada de lo anterior cambia de forma incompatible.** Lo único que se modificó en un endpoint existente es un campo nuevo y opcional (`analysis` en `/documents/{id}`).

---

## 0. Qué es la ficha y de dónde salen sus datos

- Cada PDF que llega por correo (auto, escrito de tutela, fallo, desacato, anexos) se **analiza** en el backend: el texto se enmascara (sin nombres, cédulas ni contactos del paciente), se manda a un modelo de lenguaje y la respuesta se valida y se guarda. El frontend nunca habla con el modelo.
- La **ficha** junta los análisis de todos los documentos del caso, incluidos los que llegaron en el mismo correo sin radicado (el escrito de tutela suele llegar así). Cada sección dice **de qué documento y páginas salió**.
- Lo que depende de **quién es el tenant** (si la entidad es accionada o vinculada, si una actuación le exige respuesta, si el fallo le es favorable, si una sanción la alcanza) **se calcula al leer**, con los nombres de la entidad (sección 7). El mismo documento da resultados distintos para tenants distintos.
- Una persona puede **revisar** la ficha (corregir o confirmar). Su versión manda; lo que llegue después se marca como nuevo.
- El análisis puede estar apagado o no haber terminado: la ficha de un caso sin análisis viene con las secciones en `null`. No es un error.

---

## 1. Tipos

Añadir a `api/types.ts`:

```ts
// --- Ficha del caso (SPEC 21) ---

export type TipoDocumento =
  | 'escrito_tutela' | 'auto' | 'sentencia' | 'notificacion' | 'incidente_desacato'
  | 'impugnacion' | 'contestacion' | 'anexo' | 'otro';

export interface Fuente {
  attachment_id: string;          // abrir con /documents/{id} o el expediente
  tipo_documento: TipoDocumento;
  paginas: number[];              // puede venir vacío
}

export interface Seccion<T> {
  valor: T;
  fuentes: Fuente[];
  origen: 'modelo' | 'revision';  // 'revision' = lo dejó una persona
  nuevo_desde_revision: boolean;  // llegó después de la última revisión
}

export type Confianza = 'alta' | 'media' | 'baja';

export interface DatoContacto { valor: string; confianza: Confianza; pagina: number }

export interface IdentificacionPersona {
  tipo: 'CC' | 'TI' | 'CE' | 'PA' | 'RC' | 'PPT';
  numero: string;
  confianza: Confianza;
  pagina: number;
}

export interface AccionanteFicha {
  nombre: string | null;
  municipio: string | null;
  edad: number | null;
  identificacion: IdentificacionPersona | null;
  telefonos: DatoContacto[];
  correo: DatoContacto | null;
  direccion: DatoContacto | null;
}

export interface AgenteOficioso {
  nombre: string;
  calidad: 'agente_oficioso' | 'apoderado' | 'personero' | 'defensor' | 'familiar' | 'otro';
  parentesco: string | null;
}

export interface Aseguradora {
  nombre: string;
  regimen: 'contributivo' | 'subsidiado' | 'especial' | 'excepcion' | 'no_afiliado' | null;
}

export interface MedidaFicha { solicitada: boolean; concedida: boolean | null; descripcion: string | null }

export interface Diagnostico { descripcion: string; cie10: string | null }

export interface Tecnologia {
  nombre: string;
  tipo: 'medicamento' | 'procedimiento' | 'insumo' | 'dispositivo' | 'consulta' | 'examen'
      | 'servicio' | 'transporte' | 'otro';
  presentacion: string | null;
  cantidad: string | null;
  posologia: string | null;
}

export interface Antecedente {
  fecha: string | null;           // YYYY-MM-DD
  descripcion: string;
  referencia: string | null;      // nº de fórmula, recibo u orden
  estado: 'pendiente' | 'agotado' | 'negado' | 'entregado' | 'otro' | null;
}

export interface ReclamoPrevio {
  entidad: string;
  fecha: string | null;
  numero: string | null;
  resumen: string | null;
}

export type TipoActuacion =
  | 'admisorio' | 'medida_provisional' | 'requerimiento' | 'fallo_primera' | 'fallo_segunda'
  | 'requerimiento_previo_desacato' | 'apertura_desacato' | 'decision_desacato'
  | 'consulta_desacato' | 'cierre' | 'otra';

export interface Sancionado {
  nombre: string | null;
  cargo: string | null;
  entidad: string | null;
  multa_smlmv: number | null;
  arresto_dias: number | null;
}

export interface Actuacion {
  tipo: TipoActuacion;
  descripcion: string | null;
  fecha_providencia: string | null;
  termino: { cantidad: number; unidad: 'horas' | 'dias' | 'dias_habiles'; texto: string | null } | null;
  destinatarios: string[];        // tal como aparecen: "la entidad accionada y las vinculadas"
  orden: string | null;
  sentido: 'concede' | 'niega' | 'improcedente' | 'hecho_superado' | 'parcial' | null;   // solo fallos
  decision_desacato: 'sanciona' | 'se_abstiene' | 'archiva' | 'cumplimiento' | null;
  sancionados: Sancionado[];
  pagina: number;
  verificada: boolean;            // la cita del modelo está literal en la página
}

export interface ActuacionFicha {
  actuacion: Actuacion;
  fuente: Fuente;
  nuevo_desde_revision: boolean;
  // Derivados con la entidad del tenant. null = no se puede saber (entidad sin configurar o actuación sin verificar).
  exige_respuesta_entidad: boolean | null;
  sentido_frente_entidad: 'favorable' | 'desfavorable' | null;
  sancion_entidad: boolean | null;
}

export interface EntidadDetectada {
  nombre: string;
  fuentes: ('nombre_tenant' | 'dominio_buzon' | 'frecuencia')[];
  casos: number;
  total_casos: number;
}

export interface CaseProfile {
  accionante: Seccion<AccionanteFicha> | null;
  agente_oficioso: Seccion<AgenteOficioso> | null;
  aseguradora: Seccion<Aseguradora> | null;
  lugar_atencion: Seccion<string> | null;
  objeto: Seccion<string> | null;
  hechos_resumen: Seccion<string> | null;
  derechos_invocados: Seccion<string[]> | null;
  pretensiones: Seccion<string[]> | null;
  tratamiento_integral_solicitado: Seccion<boolean> | null;
  medida_provisional: Seccion<MedidaFicha> | null;
  diagnosticos: Seccion<Diagnostico[]> | null;
  tecnologias: Seccion<Tecnologia[]> | null;
  antecedentes: Seccion<Antecedente[]> | null;
  reclamos_previos: Seccion<ReclamoPrevio[]> | null;
  pruebas_aportadas: Seccion<string[]> | null;
  partes: { rol: 'accionado' | 'vinculado'; nombre: string }[];
  actuaciones: ActuacionFicha[];
  calidad_entidad: 'accionada' | 'vinculada' | 'no_aparece' | null;
  entidad_no_configurada: boolean;
  entidad_detectada: EntidadDetectada | null;
  analisis_ids: string[];         // enviar como `based_on` al revisar
}

export interface CaseProfileResponse {
  ficha: CaseProfile;
  reviewed_at: string | null;
  reviewed_by: string | null;     // user_id; nombre con /users
}

// --- Análisis por documento (en /documents/{id}) ---

export interface DocumentAnalysis {
  tipo_documento: TipoDocumento;
  accionante: { nombre: string | null; municipio: string | null; edad: number | null } | null;
  contacto: {
    nombre: DatoContacto | null;
    identificacion: IdentificacionPersona | null;
    telefonos: DatoContacto[];
    correo: DatoContacto | null;
    direccion: DatoContacto | null;
  };
  agente_oficioso: AgenteOficioso | null;
  partes_mencionadas: { rol: 'accionado' | 'vinculado'; nombre: string }[];
  aseguradora: Aseguradora | null;
  lugar_atencion: string | null;
  objeto: string | null;
  hechos_resumen: string | null;
  derechos_invocados: string[];
  pretensiones: string[];
  tratamiento_integral_solicitado: boolean | null;
  medida_provisional: MedidaFicha | null;
  diagnosticos: Diagnostico[];
  tecnologias: Tecnologia[];
  antecedentes: Antecedente[];
  reclamos_previos: ReclamoPrevio[];
  pruebas_aportadas: string[];
  actuaciones: Actuacion[];
  observaciones: string | null;   // dudas del modelo: páginas ilegibles, contradicciones
  paginas_fuente: Record<string, number[]>;
}

// Añadir a DocumentDetail (ya existente):
//   analysis: DocumentAnalysis | null;

// --- Entidad del tenant ---

export interface EntityName {
  id: string;
  nombre: string;
  nombre_normalizado: string;
  nit: string | null;
  created_at: string;
}

export interface EntityDetection {
  configurados: boolean;          // true = hay nombres configurados y la detección no se usa
  detectada: (EntidadDetectada & { nombre_normalizado: string }) | null;
}
```

---

## 2. Cliente

Añadir a `api/endpoints.ts`:

```ts
export const cases = {
  // …lo existente…
  profile: (caseId: string) => api<T.CaseProfileResponse>(`/cases/${caseId}/ficha`),
  reviewProfile: (caseId: string, ficha: T.CaseProfile) =>
    api<T.CaseProfileResponse>(`/cases/${caseId}/ficha`, {
      method: 'PUT',
      body: JSON.stringify({ ficha, based_on: ficha.analisis_ids }),
    }),
};

export const entityNames = {
  list: () => api<T.EntityName[]>('/tenant/entity-names'),
  detection: () => api<T.EntityDetection>('/tenant/entity-names/deteccion'),
  create: (nombre: string, nit?: string) =>
    api<T.EntityName>('/tenant/entity-names', {
      method: 'POST',
      body: JSON.stringify(nit ? { nombre, nit } : { nombre }),
    }),
  remove: (id: string) => api<void>(`/tenant/entity-names/${id}`, { method: 'DELETE' }),
};
```

`documents.get(id)` no cambia: ahora la respuesta trae `analysis`.

---

## 3. Pantalla: Ficha del caso

Recomendación: una pestaña **"Ficha"** en el detalle del proceso, junto a "Línea de tiempo" y "Expediente". Cualquier miembro (`owner`, `admin`, `member`) la ve y la puede revisar.

### 3.1 Carga

```ts
const { ficha, reviewed_at, reviewed_by } = await cases.profile(caseId);
```

- `404` = el caso no existe o es de otro tenant (mismo mensaje que `/cases/{id}`).
- La respuesta va con `Cache-Control: no-store`: no guardarla en `localStorage` ni en una caché persistente. Tiene datos de salud.
- Volver a pedirla al entrar a la pestaña y después de guardar una revisión. No hace falta sondear.

### 3.2 Banner de la entidad (arriba de la ficha)

Decide si los indicadores de "le toca responder" son fiables:

| Condición | Mostrar |
| --- | --- |
| `entidad_no_configurada === true` | Aviso: "No sabemos cuál es tu entidad en este caso. Configura sus nombres para calcular a quién le toca responder." Enlace a Configuración → Entidad (sección 7). Los indicadores de §3.5 se muestran como "—". |
| `entidad_detectada !== null` | Nota discreta: "Entidad detectada automáticamente: **{nombre}** ({texto según `fuentes`})." con enlace "¿No es correcta? Configúrala". Ver textos de `fuentes` abajo. |
| Ninguna de las dos | Nada (la entidad está configurada a mano). |
| `calidad_entidad` | Chip: "Tu entidad es **accionada**" / "**vinculada**" / "**no aparece** en este caso". `null` → no mostrar. |

Textos de `fuentes`:

```ts
const FUENTE_ENTIDAD = {
  nombre_tenant: 'coincide con el nombre de tu organización',
  dominio_buzon: 'coincide con el dominio del buzón conectado',
  frecuencia: (d: T.EntidadDetectada) => `aparece en ${d.casos} de ${d.total_casos} casos`,
};
```

### 3.3 Cabecera de la ficha

| Elemento | Dato |
| --- | --- |
| Objeto de la tutela (una frase) | `ficha.objeto?.valor` |
| Accionante | `ficha.accionante?.valor.nombre`, `edad`, `municipio` |
| Documento | `accionante.valor.identificacion` → `${tipo} ${numero}` |
| Teléfonos / correo / dirección | `accionante.valor.telefonos[].valor`, `correo?.valor`, `direccion?.valor` |
| Agente oficioso | `ficha.agente_oficioso?.valor` → "{nombre} ({calidad}, {parentesco})" |
| EPS y régimen | `ficha.aseguradora?.valor.nombre`, `regimen` |
| Lugar de atención | `ficha.lugar_atencion?.valor` |
| Revisada | `reviewed_at` → "Revisada por {usuario} el {fecha}"; sin revisión → "Sin revisar" |

Los datos de contacto e identificación **salen de reglas locales, no del modelo**, y traen `confianza`: con `baja` o `media`, mostrar un ícono de "verificar".

### 3.4 Secciones de contenido

Cada `Seccion<T>` se pinta igual: el valor, y debajo una línea de procedencia (§3.6). Si la sección es `null`, ocultarla o mostrar "No aparece en los documentos" (no es un error).

| Bloque | Dato | Presentación |
| --- | --- | --- |
| Hechos | `hechos_resumen.valor` | Párrafo. Etiqueta "Resumen generado; verifícalo con el documento" cuando `origen === 'modelo'`. |
| Derechos invocados | `derechos_invocados.valor` | Chips. |
| Pretensiones | `pretensiones.valor` | Lista numerada. |
| Tratamiento integral | `tratamiento_integral_solicitado.valor` | "Solicita tratamiento integral: Sí / No". |
| Medida provisional | `medida_provisional.valor` | "Solicitada: Sí/No · Concedida: Sí / No / Sin decidir (`null`)" y la descripción. |
| Diagnósticos | `diagnosticos.valor[]` | Tabla: descripción, CIE-10 (vacío si `null`). |
| Tecnologías en salud | `tecnologias.valor[]` | Tabla: nombre, tipo, presentación, cantidad, posología. |
| Antecedentes | `antecedentes.valor[]` | Línea de tiempo por `fecha` (sin fecha al final); `estado` como badge (pendiente / agotado / negado / entregado). |
| Reclamos previos | `reclamos_previos.valor[]` | Tabla: entidad, fecha, número, resumen. |
| Pruebas aportadas | `pruebas_aportadas.valor` | Lista. |
| Partes | `partes[]` | Dos listas: accionados y vinculados. Resaltar la que coincide con la entidad (§3.2). |

### 3.5 Actuaciones (lo más importante para el equipo)

Una tarjeta por elemento de `ficha.actuaciones`, en el orden que llega (ya viene por fecha):

```
[Admisorio]  28/10/2026  ·  Término: 48 horas ("cuarenta y ocho (48) horas")
Requiere a: la entidad accionada y la vinculada
Orden: rendir informe sobre los hechos
[ TE TOCA RESPONDER ]                      Fuente: auto.pdf · pág. 1
```

| Elemento | Dato |
| --- | --- |
| Tipo | `actuacion.tipo` → etiqueta (tabla abajo) |
| Fecha | `actuacion.fecha_providencia` |
| Término | `actuacion.termino` → `${cantidad} ${unidad}` y `texto` entre comillas. `null` → "Sin término". |
| Destinatarios | `actuacion.destinatarios.join(', ')` |
| Orden | `actuacion.orden` |
| Fallo | `actuacion.sentido` (concede, niega…) y `sentido_frente_entidad` |
| Desacato | `actuacion.decision_desacato` y `sancionados[]` (nombre, cargo, entidad, multa en SMLMV, días de arresto) |
| Indicador principal | `exige_respuesta_entidad` (ver abajo) |
| Nueva | `nuevo_desde_revision` → badge "Nueva" |
| Sin verificar | `actuacion.verificada === false` → aviso "No se pudo verificar en el documento" |

Indicador "te toca responder":

| `exige_respuesta_entidad` | Mostrar |
| --- | --- |
| `true` | Badge rojo/destacado **"Te toca responder"** |
| `false` | Badge neutro "Dirigida a otra entidad" |
| `null` | "—" con tooltip: "Configura tu entidad" (si `entidad_no_configurada`) o "Actuación sin verificar" (si `!verificada`) |

Fallos (`sentido_frente_entidad`): `favorable` → verde "Favorable a tu entidad"; `desfavorable` → rojo "Desfavorable: hay órdenes para tu entidad". Desacato (`sancion_entidad === true`) → rojo "La sanción alcanza a tu entidad".

> **Importante:** el **vencimiento** del caso sigue saliendo de `/cases/{id}` (línea de tiempo, `vence_at`), como hasta ahora. El término de cada actuación en la ficha es **informativo**: no generar alertas ni calcular vencimientos en el frontend con él.

Etiquetas de `TipoActuacion`:

```ts
export const TIPO_ACTUACION: Record<T.TipoActuacion, string> = {
  admisorio: 'Admisión / vinculación',
  medida_provisional: 'Medida provisional',
  requerimiento: 'Requerimiento',
  fallo_primera: 'Fallo de primera instancia',
  fallo_segunda: 'Fallo de segunda instancia',
  requerimiento_previo_desacato: 'Requerimiento previo (desacato)',
  apertura_desacato: 'Apertura de desacato',
  decision_desacato: 'Decisión de desacato',
  consulta_desacato: 'Consulta de desacato',
  cierre: 'Archivo',
  otra: 'Otra actuación',
};
```

### 3.6 Procedencia ("¿de dónde sale esto?")

Debajo de cada sección: "Fuente: {tipo_documento} · pág. {paginas}" por cada `fuentes[]`. Al hacer clic, abrir el PDF de `attachment_id`. No hay un endpoint de contenido por `attachment_id`: se pide el detalle del documento (trae `connection_id` y `message_id`) y se descarga con `documents.pdf` de la [guía de Dashboard e Identificación](integracion-dashboard-identificacion.md):

```ts
const doc = await documents.get(fuente.attachment_id);
const blob = await documents.pdf(doc);   // con Bearer, como blob; nunca <a href> ni <iframe src> directos
openPdfViewer(URL.createObjectURL(blob), { page: fuente.paginas[0] });
```

Si el visor lo permite, saltar a `paginas[0]`. Con `origen === 'revision'`, añadir "Revisado por una persona".

### 3.7 Estados

| Estado | Mostrar |
| --- | --- |
| Todas las secciones `null` y `actuaciones` vacío | "Todavía no hay análisis de los documentos de este caso. Aparecerá cuando se procesen." (el análisis puede estar apagado o en cola). |
| Algunas secciones `null` | Ocultarlas o "No aparece en los documentos". |
| Error `404` | "Proceso no encontrado". |

---

## 4. Revisar la ficha (`PUT`)

Cualquier miembro puede corregir o confirmar. Se guarda **la ficha completa** (append-only, auditado sin valores).

### 4.1 Flujo

1. Botón **"Revisar ficha"** → modo edición sobre una copia de `ficha`.
2. Editar en sitio solo `valor` de las secciones revisables: textos (objeto, hechos), listas (pretensiones, derechos, pruebas), tablas (diagnósticos, tecnologías, antecedentes, reclamos), accionante, agente, aseguradora, medida, tratamiento integral, partes y actuaciones (tipo, término, destinatarios, orden…).
3. No editar: `fuentes`, `origen`, `nuevo_desde_revision`, `calidad_entidad`, `entidad_*`, `exige_respuesta_entidad`, `sentido_frente_entidad`, `sancion_entidad`, `analisis_ids`. El backend los recalcula.
4. **"Confirmar sin cambios"** también es una revisión válida: enviar la ficha tal como llegó.
5. Guardar:

```ts
try {
  const res = await cases.reviewProfile(caseId, fichaEditada);
  setFicha(res.ficha);               // ya viene recalculada
} catch (e) {
  if (e instanceof ApiError && e.status === 409 && e.code === 'case_profile_outdated') {
    // Llegó un documento nuevo mientras se revisaba.
    showDialog('Llegaron documentos nuevos a este caso. Recarga la ficha para revisarla con todo.');
    return;
  }
  if (e instanceof ApiError && e.status === 422) return showBanner('Hay datos con un formato no válido.');
  throw e;
}
```

`based_on` debe ser **exactamente** el `analisis_ids` de la ficha que se cargó (el cliente de §2 ya lo hace). Si se recarga la ficha antes de guardar, se pierden los cambios: avisar.

### 4.2 Después de revisar

- Las secciones revisadas vuelven con `origen: 'revision'`.
- Si después llega otro documento (por ejemplo, el fallo), sus aportes aparecen con `nuevo_desde_revision: true`: badge **"Nuevo"** y un aviso arriba "Hay información nueva desde la última revisión".

---

## 5. Referencia rápida de endpoints

| Método y ruta | Rol | Body | Respuesta | Errores |
| --- | --- | --- | --- | --- |
| `GET /cases/{id}/ficha` | miembro | — | `200 CaseProfileResponse` | `404` |
| `PUT /cases/{id}/ficha` | miembro | `{ ficha: CaseProfile, based_on: string[] }` | `200 CaseProfileResponse` | `404`, `409 case_profile_outdated`, `422` |
| `GET /documents/{id}` | miembro | — | `200 DocumentDetail` (+ `analysis`) | `404` |
| `GET /tenant/entity-names` | miembro | — | `200 EntityName[]` | — |
| `GET /tenant/entity-names/deteccion` | miembro | — | `200 EntityDetection` | — |
| `POST /tenant/entity-names` | owner, admin | `{ nombre, nit? }` | `201 EntityName` | `403`, `409 entity_name_already_exists`, `409 entity_name_limit_reached`, `422 invalid_entity_name` |
| `DELETE /tenant/entity-names/{id}` | owner, admin | — | `204` | `403`, `404` |

---

## 6. Detalle del documento: `analysis`

En la pantalla de detalle de una providencia (`GET /documents/{id}`) llega `analysis: DocumentAnalysis | null`.

- `null` → el documento no se analizó (análisis apagado, en cola, o falló). No mostrar nada o "Sin análisis".
- Con valor, una pestaña o panel **"Análisis"** con: tipo de documento, objeto, hechos, actuaciones del documento y `observaciones` (si viene, mostrarla destacada: son dudas del modelo, por ejemplo páginas ilegibles).
- Para la vista consolidada del caso, usar la ficha (§3); el `analysis` de un documento es solo de ese documento y **no** trae los indicadores de la entidad.

---

## 7. Configuración → Entidad (owner/admin)

Pantalla nueva en Configuración, junto al catálogo de identificaciones.

### 7.1 Carga

```ts
const [nombres, deteccion] = await Promise.all([entityNames.list(), entityNames.detection()]);
```

### 7.2 Contenido

| Situación | Mostrar |
| --- | --- |
| `nombres.length > 0` | Tabla de nombres (nombre, NIT, fecha) con botón eliminar. Texto: "La ficha usa estos nombres para saber cuándo una orden va dirigida a tu entidad." |
| Sin nombres y `deteccion.detectada` | Tarjeta: "Detectamos que tu entidad es **{nombre}** ({texto de fuentes}). Si es correcto no necesitas hacer nada." Botones: **"Confirmar"** (crea el nombre con `entityNames.create(detectada.nombre)`) y **"No es mi entidad"** (abre el formulario). |
| Sin nombres y sin detección | Aviso: "Aún no podemos saber cuál es tu entidad. Agrega el nombre con que aparece en los autos y fallos." + formulario. |

Formulario "Agregar nombre": campo **Nombre tal como aparece en los documentos** (ej. "Offimédicas S.A."; no el nombre técnico de la organización) y **NIT** opcional. Ayuda: "Si en los documentos aparece con otra forma (una sigla), agrégala también. Mayúsculas, tildes y S.A./S.A.S. no importan."

Errores:

| Código | Mensaje |
| --- | --- |
| `invalid_entity_name` | "Ese nombre es demasiado genérico (por ejemplo 'S.A.' o 'EPS') o el NIT no es válido." |
| `entity_name_already_exists` | "Ese nombre ya está registrado (o uno equivalente)." |
| `entity_name_limit_reached` | "Llegaste al máximo de 20 nombres." |

Para `member`: mostrar la pantalla en solo lectura (la lista y la detección), sin formulario ni botones.

---

## 8. Mapeo de códigos nuevos

Añadir a `errorText(code)`:

```ts
case_profile_outdated: 'Llegaron documentos nuevos a este caso. Recarga la ficha.',
invalid_entity_name: 'Ese nombre es demasiado genérico o el NIT no es válido.',
entity_name_already_exists: 'Ese nombre ya está registrado.',
entity_name_limit_reached: 'Llegaste al máximo de 20 nombres.',
```

---

## 9. Privacidad (obligatorio)

- La ficha y el `analysis` tienen **datos de salud y de contacto**. No guardarlos en `localStorage`, `sessionStorage`, IndexedDB ni en cachés persistentes del cliente; no enviarlos a herramientas de analítica, monitoreo de errores (Sentry y similares) ni a logs del navegador.
- Al registrar errores, usar solo el código (`ApiError.code`) y el `X-Request-ID`, nunca el cuerpo de la ficha.
- No hacer capturas automáticas (session replay) en la pestaña Ficha.

---

## 10. Checklist de verificación

- [ ] La pestaña Ficha carga con `GET /cases/{id}/ficha` y muestra "Todavía no hay análisis" en un caso sin análisis.
- [ ] Con la entidad sin configurar, se ve el aviso y los indicadores de actuaciones salen como "—".
- [ ] Con entidad detectada automáticamente, se ve la nota con su evidencia y el enlace a configurarla.
- [ ] Cada actuación muestra tipo, término, destinatarios, orden y el indicador "Te toca responder" / "Dirigida a otra entidad".
- [ ] Hacer clic en una fuente abre el PDF del documento correcto.
- [ ] Revisar y guardar devuelve la ficha con `origen: 'revision'` en lo editado; "Confirmar sin cambios" también guarda.
- [ ] Simular `409 case_profile_outdated` (guardar con un `based_on` viejo) muestra el aviso de recargar.
- [ ] En Configuración → Entidad, owner/admin pueden confirmar la detección, agregar y quitar nombres; un member solo ve.
- [ ] `invalid_entity_name` aparece al intentar guardar "S.A." o "EPS".
- [ ] Ningún dato de la ficha queda en `localStorage` ni en las herramientas de monitoreo.

---

## 11. Limitaciones a tener en cuenta

- **El vencimiento sigue siendo uno por providencia** (SPEC 13). Si un auto tiene dos actuaciones con plazos distintos (48 h y 24 h), la línea de tiempo del caso muestra el plazo del auto; la ficha muestra los dos como información.
- **El resumen de hechos lo genera un modelo**: puede omitir detalles. Por eso cada sección enlaza al documento y la ficha se puede revisar.
- **El análisis tarda** unos segundos por documento después de procesarse el PDF; un caso recién llegado puede tener la ficha incompleta durante un momento.
- **Documentos revisados a mano antes del análisis**: si una providencia tenía una revisión humana de sus campos, el reprocesado masivo no la analiza; se analiza solo si vuelve a llegar.
- **Datos de contacto e identificación** vienen de reglas sobre el texto (no del modelo) y pueden faltar si el documento no los trae claros.
