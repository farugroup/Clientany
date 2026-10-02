# Clientany · CRM multiempresa — diseño y contrato

> Este documento es la fuente de verdad del CRM nuevo. Lo escribió el chat
> principal; los agentes que construyen cada pieza lo siguen al pie de la
> letra. Si algo no cierra, se cambia ACÁ primero y después en el código.

## Qué es

Clientany vende a empresas (ecommerce, tiendas, servicios) un CRM
multicanal: la empresa conecta **su** WhatsApp Business (Cloud API de Meta),
**su** Instagram y **su** Messenger, carga (a mano, por CSV o por API) su
historial de pedidos y su stock, arma respuestas automáticas, y atiende todo
desde una sola bandeja con su equipo. Es la copia multiempresa del módulo
«Mensajes» del hub de FARU FITNESS, con la misma idea de producto:
bandeja por grupos, chat completo, ficha del cliente con sus pedidos, bot con
candados para no molestar, plantillas y rápidas, chat del equipo, modo celular.

Registro: todo en **español rioplatense**, textos de UI prolijos, sin emojis
como íconos (lucide-react), colores sólo por clases Tailwind del tema
(`brand-*`, `ink-*`) salvo los colores que son un DATO (canal, etapa,
etiqueta, estado de pedido), que van fijos con su hexa.

## Dos modos, un solo código

| | Modo demo | Modo nube |
|---|---|---|
| Cuándo | No hay `NEXT_PUBLIC_SUPABASE_URL` (o `NEXT_PUBLIC_CLIENTANY_MODO=demo`) | Supabase configurado, o `NEXT_PUBLIC_CLIENTANY_MODO=nube` |
| Dónde viven los datos | `localStorage` del navegador (`clientany-crm`) | Postgres de Supabase (tablas `crm_*`), vía `/api/crm/*` |
| Quién corre el bot | El navegador (`evaluarBot`) en el simulador | El servidor, en el webhook de Meta |
| Mensajes reales | No salen (se marcan «enviado (demo)») | Salen por la Graph API con las credenciales de la empresa |
| Para qué sirve | Que cualquiera pruebe TODO desde la landing sin registrarse | El producto de verdad |

El repositorio activo lo elige `lib/crm/index.tsx` (`CrmArranque`). La UI
nunca sabe en qué modo está salvo para mostrar el cartel «modo demo».

**Modo nube de desarrollo**: `CLIENTANY_DB=memory` + `NEXT_PUBLIC_CLIENTANY_MODO=nube`
+ `CLIENTANY_DEV_USER=dev@clientany.com`. El servidor usa `db-memoria.ts`
(persiste en `.clientany-dev/db.json`) y el usuario es fijo: sirve para
`next dev`, para la suite de API y para Playwright. Sin Supabase.

## Carpetas y quién es dueño de cada archivo

```
lib/crm/
  types.ts        ← contrato de tipos (chat principal)
  core.ts         ← lógica pura: bandeja, ventana 24 hs, teléfonos, horario (chat principal)
  bot.ts          ← motor de respuestas automáticas, puro (chat principal)
  csv.ts          ← importar/exportar CSV (chat principal)
  repo.ts         ← store zustand `useCrm` + interfaz `CrmRepo` (chat principal)
  index.tsx       ← arranque: elige repo, `CrmArranque`, pulso de presencia      (agente A)
  repo-local.ts   ← implementación demo (localStorage)                             (agente A)
  repo-nube.ts    ← implementación nube (fetch a /api/crm)                         (agente A)
  hooks.ts        ← hooks de lectura para las pantallas (firmas abajo)             (agente A)
  demo.ts         ← `datosDePrueba(empresa_id, ahora)` (la usan demo y servidor)   (agente A)
  metricas.ts     ← `calcularMetricas(...)` pura (la usan demo y servidor)         (agente A)
  server/
    db.ts         ← interfaz `CrmDb` (chat principal)
    db-memoria.ts, db-supabase.ts, db-factory.ts, crypto.ts, auth.ts,
    meta.ts (Graph API), servicio.ts (casos de uso), ia.ts, api-key.ts   (agente B)
app/api/crm/**            ← rutas internas (sesión)                                (agente B)
app/api/webhooks/meta/[empresaId]/route.ts                                         (agente B)
app/api/v1/**             ← API pública con clave                                  (agente B)
supabase/crm_schema.sql   ← esquema (chat principal)
components/crm/ui.tsx     ← Modal, Avisos, Confirmar, Campo, Interruptor, Tabla… (chat principal)
components/crm/bandeja/*  ← lista, chat, burbujas, acciones, ficha, posponer…      (agente C)
app/(app)/inbox/page.tsx, app/(app)/embudo/page.tsx, app/(app)/clientes/page.tsx (agente C)
app/(app)/pedidos, stock, automaticas, plantillas, conexiones, equipo/page.tsx   (agente D)
app/(app)/panel/page.tsx, app/(app)/ajustes/page.tsx (secciones CRM)             (agente D)
components/crm/pantallas/* (piezas de esas pantallas)                             (agente D)
app/page.tsx (landing), app/docs, app/privacidad, app/terminos, lib/nav.ts,
components/Sidebar.tsx, MobileNav.tsx, Topbar.tsx, lib/supabase/middleware.ts,
public/manifest.json, README.md                                                   (agente E)
```

Cada agente toca SÓLO sus archivos. Lo compartido (tipos, core, repo, ui)
no se edita: si falta algo, se pide al chat principal.

## El store y los hooks (contrato de lectura)

Todo lo que ve la pantalla sale de `useCrm` (`lib/crm/repo.ts`). Todo lo
que escribe pasa por `getRepo()` (interfaz `CrmRepo` en el mismo archivo).
`lib/crm/hooks.ts` expone EXACTAMENTE estas firmas (las pantallas de C y D
se escriben contra ellas en paralelo, así que no cambian):

```ts
export function useRepo(): CrmRepo;                 // getRepo()
export function useModo(): "demo" | "nube";
export function useEmpresa(): Empresa | null;
export function useYo(): Miembro | null;
export function useEsAdmin(): boolean;
export function useMarcaActiva(): string;            // "all" o id (de useApp.activeBrandId)
// Bandeja: filas ya filtradas y con grupo calculado; respeta la marca activa.
export function useBandeja(filtro: FiltroBandeja): {
  filas: FilaBandeja[];
  conteos: Record<Grupo, number> & { sin_responder: number };
};
// Una conversación abierta: carga sus mensajes a demanda, marca leído al
// abrir, y en nube refresca cada 4 s mientras esté montado.
export function useConversacion(id: string | null): {
  conv: Conversacion | null;
  mensajes: Mensaje[];
  cargando: boolean;
  contacto: Contacto | null;
  pedidos: Pedido[];        // del contacto (pedidosDeContacto)
};
export function useContactos(q?: string): Contacto[];
export function usePedidos(q?: string, estado?: PedidoEstado | "todos"): Pedido[];
export function useProductos(q?: string): Producto[];
export function useBot(): Bot;
export function usePlantillas(): Plantilla[];
export function useRapidas(): Rapida[];             // compartidas + las mías
export function useEquipoChat(): MensajeEquipo[];
export function useMiembros(): Miembro[];
export function useInvitaciones(): Invitacion[];
export function useCanales(): Canal[];
export function useApiKeys(): ApiKey[];
export function useActividad(): Actividad[];
export function useMetricas(): { datos: Metricas | null; cargando: boolean; recargar: () => void };
// Nube: refresca la lista cada 5 s mientras `activo`; demo: no hace nada.
export function usePolling(activo: boolean, convId?: string | null): void;
```

Errores: el repo lanza `CrmError` con mensaje criollo. La pantalla lo
muestra con `avisar(e, "error")` de `components/crm/ui.tsx`.

## Contrato REST interno (`/api/crm/*`, sesión por cookie)

Todas devuelven JSON. Error: `{ error: "texto criollo", codigo?: string }`
con 400/401/403/404/409/500. El agente A (repo-nube) y el agente B (rutas)
construyen contra esta lista en paralelo: no se cambia.

| Método y ruta | Cuerpo | Devuelve |
|---|---|---|
| `GET /api/crm/estado` | — | `{ empresa, yo, miembros, invitaciones, canales, conversaciones (últimas 500 por `actualizado`), contactos, pedidos, productos, bot, plantillas, rapidas, equipo (últimos 200), api_keys, actividad (últimos 50) }`. Si el usuario no tiene empresa, la crea (nombre: metadata `name`/`empresa` del usuario, o el mail). Si tiene invitación pendiente, lo suma a esa empresa. |
| `GET /api/crm/cambios?desde=ISO&conv=ID` | — | `{ conversaciones: [cambiadas desde], mensajes: [de `conv` creados desde], equipo: [nuevos desde], miembros, ahora }` |
| `PUT /api/crm/empresa` | `Partial<Empresa> & { ia_clave?: string }` | `Empresa` (la clave de IA se cifra; nunca vuelve) |
| `POST /api/crm/demo` / `DELETE /api/crm/demo` | — | `{ ok: true }` (carga / vacía datos de prueba) |
| `POST /api/crm/equipo/invitar` | `{ email, nombre?, rol }` | `{ miembro? , invitacion? }` |
| `PATCH /api/crm/equipo/:id` | `{ rol?, nombre? }` | `Miembro` |
| `DELETE /api/crm/equipo/:id` | — | `{ ok }` |
| `DELETE /api/crm/equipo/invitaciones/:id` | — | `{ ok }` |
| `POST /api/crm/equipo/pulso` | — | `{ ok }` (presencia) |
| `POST /api/crm/equipo/chat` | `{ texto, ref? }` | `MensajeEquipo` |
| `PATCH /api/crm/equipo/chat/:id` | `{ estado }` | `MensajeEquipo` |
| `DELETE /api/crm/equipo/chat/:id` | — | `{ ok }` |
| `POST /api/crm/canales` | `ConectarCanalInput` | `Canal` (prueba las credenciales contra Graph ANTES de guardar; si fallan, 400 con el motivo) |
| `POST /api/crm/canales/:id/probar` | — | `{ ok, detalle?, error? }` |
| `DELETE /api/crm/canales/:id` | — | `{ ok }` |
| `POST /api/crm/canales/:id/plantillas/sincronizar` | — | `Plantilla[]` (trae las de Meta del WABA) |
| `GET /api/crm/conversaciones/:id/mensajes` | — | `Mensaje[]` (y marca leído) |
| `POST /api/crm/conversaciones/:id/mensajes` | `{ texto, cita_id? }` | `Mensaje` (manda por Graph; fuera de ventana: 400 `ventana_cerrada`) |
| `POST /api/crm/conversaciones/:id/plantilla` | `{ nombre, idioma?, parametros }` | `Mensaje` |
| `POST /api/crm/conversaciones/:id/archivo` | multipart `archivo`, `texto?` | `Mensaje` |
| `POST /api/crm/conversaciones/:id/leido` | — | `{ ok }` |
| `POST /api/crm/conversaciones/:id/accion` | `AccionConversacion` | `Conversacion` |
| `DELETE /api/crm/conversaciones/:id` | — | `{ ok }` |
| `DELETE /api/crm/conversaciones/:id/mensajes/:mid` | — | `{ ok }` |
| `POST /api/crm/conversaciones` | `NuevaConversacionInput` | `Conversacion` |
| `POST /api/crm/simular` | `SimularEntranteInput` | `{ conversacion, mensaje, bot }` (crea el entrante como si fuera el webhook y corre el bot) |
| `GET /api/crm/buscar?q=` | — | `{ conversaciones, contactos, pedidos }` |
| `POST /api/crm/contactos` | `Partial<Contacto> & { nombre }` (con `id` actualiza) | `Contacto` |
| `DELETE /api/crm/contactos/:id` | — | `{ ok }` |
| `POST /api/crm/contactos/importar` | `{ contactos: Contacto[] }` | `{ nuevos, actualizados }` (dedupe por teléfono/email) |
| `POST /api/crm/pedidos` | `Partial<Pedido> & { numero, nombre }` | `Pedido` (ata el contacto por teléfono/mail) |
| `DELETE /api/crm/pedidos/:id` | — | `{ ok }` |
| `POST /api/crm/pedidos/importar` | `{ pedidos: Pedido[] }` | `{ nuevos, actualizados }` (upsert por número) |
| `POST /api/crm/productos` | `Partial<Producto> & { sku, nombre }` | `Producto` |
| `DELETE /api/crm/productos/:id` | — | `{ ok }` |
| `POST /api/crm/productos/:id/ajustar` | `{ delta, motivo? }` | `Producto` |
| `POST /api/crm/productos/importar` | `{ productos: Producto[] }` | `{ nuevos, actualizados }` (upsert por sku) |
| `PUT /api/crm/bot` | `Bot` | `Bot` |
| `POST /api/crm/bot/probar` | `{ texto, canal?, conversacion_id?, fuera_de_horario? }` | `BotResultado` |
| `POST /api/crm/plantillas` / `DELETE /api/crm/plantillas/:id` | `Partial<Plantilla>` | `Plantilla` / `{ ok }` |
| `POST /api/crm/rapidas` / `DELETE /api/crm/rapidas/:id` | `Partial<Rapida>` | `Rapida` / `{ ok }` |
| `POST /api/crm/api-keys` | `{ nombre }` | `{ key: ApiKey, secreto }` |
| `DELETE /api/crm/api-keys/:id` | — | `{ ok }` |
| `POST /api/crm/ia/sugerir` | `{ conversacion_id, borrador? }` **o** (sin sesión, modo demo) `{ contexto: { empresa: {nombre, rubro, instrucciones}, mensajes: Mensaje[], contacto?, pedidos?, productos? }, borrador? }` | `Sugerencia` |
| `GET /api/crm/metricas` | — | `Metricas` |
| `GET /api/crm/exportar/:que` (`contactos`,`pedidos`,`productos`) | — | `text/csv` |
| `GET /api/crm/media/:clave` | — | el archivo (memoria) o redirect a la URL pública (Supabase) |

### Webhook de Meta (público)

`GET|POST /api/webhooks/meta/:empresaId`

- `GET`: verificación. `hub.mode=subscribe` y `hub.verify_token` ==
  `empresa.webhook_verify_token` → devuelve `hub.challenge` (200, texto).
- `POST`: siempre responde 200 rápido. Valida `X-Hub-Signature-256` con el
  `app_secret` del canal **si está cargado** (si no, acepta y lo anota en el
  log). `parsearWebhook(body)` (meta.ts) normaliza `whatsapp_business_account`
  (messages + statuses + echoes de Coexistence), `instagram` (messaging) y
  `page` (Messenger) a `WebhookParseado`. Por cada entrante:
  1. busca el canal por `(tipo, externo_id)` dentro de la empresa;
  2. idempotencia por `externo_id` (si el mensaje ya existe, salta);
  3. contacto: upsert por teléfono / ig_id / psid (nombre del perfil si vino);
  4. conversación: upsert por `(canal_id, identificador)`; actualiza
     `ultimo_*`, `no_leidos`, `ultimo_entrante_en`, saca `fuera_horario` si
     está abierto;
  5. guarda el mensaje (media: baja el archivo con el token y lo sube al
     storage, guarda `media_url`);
  6. si NO es eco: corre `evaluarBot` y manda cada respuesta por Graph,
     guardando el mensaje saliente con `de: "bot"`, `autor: "Bot"`;
     aplica `cambios` a la conversación;
  7. si la empresa tiene `webhook_salida_url`, POSTea `{ evento: "mensaje_entrante", conversacion, mensaje }` (best effort, 5 s).
  Los `statuses` actualizan `estado` del mensaje por `externo_id`
  (`sent→enviado`, `delivered→entregado`, `read→leido`, `failed→fallido` con
  el error criollo).

### API pública (`/api/v1/*`, clave en `X-API-Key` o `Authorization: Bearer`)

| Ruta | Qué hace |
|---|---|
| `GET /api/v1/pedidos?desde=&estado=` · `POST /api/v1/pedidos` (uno o lista; upsert por `numero`) · `GET/PATCH /api/v1/pedidos/:numero` | Pedidos |
| `GET /api/v1/productos` · `POST /api/v1/productos` (uno o lista; upsert por `sku`) · `PATCH /api/v1/productos/:sku` (`{ stock?, precio?, activo?… }`) | Stock |
| `GET /api/v1/contactos?q=` · `POST /api/v1/contactos` (upsert por teléfono/email) | Contactos |
| `GET /api/v1/conversaciones?desde=` · `GET /api/v1/conversaciones/:id/mensajes` | Lectura de la bandeja |
| `POST /api/v1/mensajes` `{ telefono \| conversacion_id, texto? , plantilla?: {nombre, idioma?, parametros}, canal_id? }` | Manda por WhatsApp (texto si hay ventana, si no exige plantilla) |
| `GET /api/v1/yo` | `{ empresa: {id, nombre}, key: {nombre, prefijo} }` para probar la clave |

Las claves se guardan **hasheadas** (sha256); el secreto se muestra una sola
vez. Se registra `ultimo_uso`.

## Variables de entorno (nuevas)

| Variable | Para qué |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | El servidor escribe en las tablas `crm_*` y en el bucket `crm-media` |
| `CLIENTANY_SECRET` | Clave de cifrado (AES-256-GCM) de tokens de Meta y claves de IA. Obligatoria en nube; en memoria se deriva una fija |
| `ANTHROPIC_API_KEY` | IA de la plataforma (copilot) |
| `CLIENTANY_IA_MODELO` | Modelo (de fábrica `claude-opus-5-5`) |
| `CLIENTANY_DB` | `memory` para desarrollo/tests |
| `CLIENTANY_DEV_USER` | Mail del usuario fijo en memoria |
| `NEXT_PUBLIC_CLIENTANY_MODO` | `nube` o `demo` para forzar el modo en el navegador |
| `NEXT_PUBLIC_APP_URL` | Para armar la URL del webhook que se muestra en Conexiones |

## Reglas de negocio que no se rompen

- **Una empresa nunca ve a otra**: toda consulta del servidor lleva
  `empresa_id` del miembro de la sesión; una ruta que reciba un id ajeno
  responde 404.
- **Credenciales**: los tokens de Meta y la clave de IA se cifran en la base
  y nunca vuelven al navegador (`token_cargado: true`). Se **prueban antes de
  guardarse** (como en el hub): una que no anda no se guarda.
- **Bot con candados**: bienvenida una vez cada 24 hs por chat; ausencia una
  vez cada 12 hs; tope por chat y día; calla si una persona respondió hace
  menos de N min o si el chat está tomado; nunca a quien pidió la baja; nunca
  en canal manual. Todo en `evaluarBot` (puro, probado).
- **Ventana de 24 hs** (WhatsApp/IG/FB): fuera de la ventana no se intenta
  un texto libre; se ofrece plantilla (WhatsApp) y se explica.
- **Idempotencia del webhook** por `externo_id` (índice único).
- **Lo que no se sabe se dice** («sin dato»), no se inventa un cero.
- **Una pantalla que esconde filas dice cuántas y cómo verlas.**

## Textos y nombres de pantalla

Menú (lib/nav.ts, grupos):
- **Principal**: Panel · Bandeja · Clientes · Pedidos · Stock
- **Automatización**: Respuestas automáticas · Plantillas y rápidas · Embudo
- **Crecimiento** (lo que ya existía): Seguí tu envío · Recuperador de carritos · Campañas · Difusión · Mercado Libre · Marcas
- **Cuenta**: Conexiones · Equipo · Configuración

Rutas nuevas: `/inbox` (bandeja), `/clientes`, `/pedidos`, `/stock`,
`/automaticas`, `/plantillas`, `/embudo`, `/conexiones`, `/equipo`.
Se retiran del menú (se borran los archivos): `/channels` (lo reemplaza
Conexiones), `/catalogo` (lo reemplaza Stock), `/atencion` (lo reemplazan
Respuestas automáticas y Equipo).

Grupos de la bandeja: Ventas · Soporte · Más adelante · Resueltos · Baja
(ver `GRUPOS` en core.ts, con sus textos vacíos). Filtro «Todos los canales ▾»
y orden «Recientes ▾». Buscar ignora los grupos y cada fila dice en cuál está.

Acciones del chat (encabezado en la compu, menú «⋯» en el celular):
Respondido · Resolver/Reabrir · Soporte · Mañana · Posponer… · Lo tomo yo /
Lo tengo yo · soltar · Asignar a… · Marcar urgente · Etapa · Etiquetas ·
Nota interna · Ficha · Baja / Sacar de Baja · Borrar conversación.

## Cómo se prueba

- `npx tsc --noEmit` y `npm run build` en verde.
- `tests/crm-core.spec.mjs`: lógica pura (bandeja, bot, csv, teléfonos).
- `tests/crm-api.spec.mjs`: la API en modo memoria contra `next dev`
  (registro implícito, canales con Graph simulado, webhook simulado, bot,
  bandeja, pedidos, stock, API pública con clave).
- `tests/crm-ui.cjs`: Playwright, escritorio y celular, recorre cada pantalla
  y cada acción en modo demo y en modo nube (memoria).
