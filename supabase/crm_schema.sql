-- ============================================================
-- Clientany · CRM multiempresa — esquema (Supabase / Postgres)
-- Ejecutalo en Supabase → SQL Editor → New query → Run.
-- Se puede correr más de una vez: todo es `if not exists`.
--
-- El servidor escribe con la SERVICE ROLE KEY (saltea RLS). RLS queda
-- habilitado SIN políticas para que la anon key no pueda leer nada.
-- ============================================================

create table if not exists public.crm_empresas (
  id text primary key,
  nombre text not null,
  rubro text,
  pais text not null default 'Argentina',
  moneda text not null default 'ARS',
  plan text not null default 'prueba',
  prueba_hasta timestamptz,
  creado timestamptz not null default now(),
  webhook_verify_token text not null,
  webhook_salida_url text,
  ia jsonb not null default '{"proveedor":"plataforma","clave_cargada":false}'::jsonb,
  ia_clave_cifrada text,
  horario jsonb not null default '{}'::jsonb,
  etapas jsonb not null default '[]'::jsonb,
  etiquetas jsonb not null default '[]'::jsonb,
  firma text,
  bot jsonb not null default '{}'::jsonb
);

create table if not exists public.crm_miembros (
  id text primary key,                 -- auth.users.id (uuid como texto)
  empresa_id text not null references public.crm_empresas(id) on delete cascade,
  nombre text not null default '',
  email text not null,
  rol text not null default 'agente',  -- admin | agente
  avatar text,
  ultimo_visto timestamptz,
  creado timestamptz not null default now()
);
create index if not exists crm_miembros_empresa on public.crm_miembros(empresa_id);
create index if not exists crm_miembros_email on public.crm_miembros(lower(email));

create table if not exists public.crm_invitaciones (
  id text primary key,
  empresa_id text not null references public.crm_empresas(id) on delete cascade,
  email text not null,
  rol text not null default 'agente',
  creado timestamptz not null default now(),
  por text not null
);
create index if not exists crm_invitaciones_email on public.crm_invitaciones(lower(email));

create table if not exists public.crm_canales (
  id text primary key,
  empresa_id text not null references public.crm_empresas(id) on delete cascade,
  tipo text not null,                  -- whatsapp | instagram | messenger | manual
  nombre text not null default '',
  marca_id text,
  estado text not null default 'pendiente',
  externo_id text not null,            -- phone_number_id | ig user id | page id | manual:<id>
  waba_id text,
  page_id text,
  token_cifrado text,
  app_secret_cifrado text,
  ultimo_error text,
  conectado_en timestamptz,
  detalle jsonb not null default '{}'::jsonb,
  api_version text,
  creado timestamptz not null default now()
);
create index if not exists crm_canales_empresa on public.crm_canales(empresa_id);
create index if not exists crm_canales_externo on public.crm_canales(tipo, externo_id);

create table if not exists public.crm_contactos (
  id text primary key,
  empresa_id text not null references public.crm_empresas(id) on delete cascade,
  nombre text not null default '',
  telefono text,
  telefono_cola text,                  -- últimos 10 dígitos, para buscar
  email text,
  documento text,
  ig_usuario text,
  ig_id text,
  psid text,
  direccion text,
  localidad text,
  provincia text,
  cp text,
  notas text,
  etiquetas jsonb not null default '[]'::jsonb,
  origen text not null default 'manual',
  marca_id text,
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now()
);
create index if not exists crm_contactos_empresa on public.crm_contactos(empresa_id, actualizado desc);
create index if not exists crm_contactos_tel on public.crm_contactos(empresa_id, telefono_cola);
create index if not exists crm_contactos_ig on public.crm_contactos(empresa_id, ig_id);
create index if not exists crm_contactos_psid on public.crm_contactos(empresa_id, psid);
create index if not exists crm_contactos_email on public.crm_contactos(empresa_id, lower(email));

create table if not exists public.crm_conversaciones (
  id text primary key,
  empresa_id text not null references public.crm_empresas(id) on delete cascade,
  canal_id text not null,
  canal text not null,
  contacto_id text not null,
  identificador text not null,
  nombre text not null default '',
  marca_id text,
  ultimo_texto text not null default '',
  ultimo_en timestamptz not null default now(),
  ultimo_de text not null default 'cliente',
  ultimo_entrante_en timestamptz,
  ultimo_saliente_humano_en timestamptz,
  no_leidos int not null default 0,
  grupo text,
  etapa_id text,
  etiquetas jsonb not null default '[]'::jsonb,
  nota text,
  asignado_a text,
  tomado_por jsonb,
  urgente boolean not null default false,
  recordar jsonb,
  baja boolean not null default false,
  fuera_horario boolean not null default false,
  necesita_humano boolean not null default false,
  visto_in timestamptz,
  pedido_id text,
  bot_estado jsonb,
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now()
);
create unique index if not exists crm_conv_canal_ident on public.crm_conversaciones(canal_id, identificador);
create index if not exists crm_conv_empresa on public.crm_conversaciones(empresa_id, actualizado desc);

create table if not exists public.crm_mensajes (
  id text primary key,
  empresa_id text not null references public.crm_empresas(id) on delete cascade,
  conversacion_id text not null references public.crm_conversaciones(id) on delete cascade,
  direccion text not null,             -- in | out
  de text not null,                    -- cliente | agente | bot | sistema
  autor text,
  tipo text not null default 'texto',
  texto text not null default '',
  media_url text,
  media_nombre text,
  media_mime text,
  externo_id text,                     -- wamid / mid: único por empresa (idempotencia del webhook)
  estado text,
  error text,
  cita_id text,
  plantilla text,
  creado timestamptz not null default now()
);
create index if not exists crm_msj_conv on public.crm_mensajes(conversacion_id, creado);
create index if not exists crm_msj_empresa_fecha on public.crm_mensajes(empresa_id, creado);
create unique index if not exists crm_msj_externo on public.crm_mensajes(empresa_id, externo_id) where externo_id is not null;

create table if not exists public.crm_pedidos (
  id text primary key,
  empresa_id text not null references public.crm_empresas(id) on delete cascade,
  numero text not null,
  contacto_id text,
  nombre text not null default '',
  telefono text,
  telefono_cola text,
  email text,
  estado text not null default 'pagado',
  items jsonb not null default '[]'::jsonb,
  total numeric not null default 0,
  moneda text not null default 'ARS',
  envio jsonb,
  canal text,
  notas text,
  marca_id text,
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now()
);
create unique index if not exists crm_pedidos_numero on public.crm_pedidos(empresa_id, numero);
create index if not exists crm_pedidos_empresa on public.crm_pedidos(empresa_id, creado desc);
create index if not exists crm_pedidos_tel on public.crm_pedidos(empresa_id, telefono_cola);
create index if not exists crm_pedidos_email on public.crm_pedidos(empresa_id, lower(email));

create table if not exists public.crm_productos (
  id text primary key,
  empresa_id text not null references public.crm_empresas(id) on delete cascade,
  sku text not null,
  nombre text not null,
  precio numeric not null default 0,
  moneda text not null default 'ARS',
  stock int not null default 0,
  stock_minimo int,
  categoria text,
  descripcion text,
  imagen_url text,
  activo boolean not null default true,
  marca_id text,
  actualizado timestamptz not null default now()
);
create unique index if not exists crm_productos_sku on public.crm_productos(empresa_id, sku);

create table if not exists public.crm_plantillas (
  id text primary key,
  empresa_id text not null references public.crm_empresas(id) on delete cascade,
  canal_id text,
  nombre text not null,
  idioma text not null default 'es_AR',
  categoria text,
  estado text not null default 'local',
  cuerpo text not null default '',
  variables int not null default 0,
  ejemplo jsonb,
  actualizado timestamptz not null default now()
);
create unique index if not exists crm_plantillas_nombre on public.crm_plantillas(empresa_id, nombre, idioma);

create table if not exists public.crm_rapidas (
  id text primary key,
  empresa_id text not null references public.crm_empresas(id) on delete cascade,
  atajo text not null,
  texto text not null,
  de text
);
create index if not exists crm_rapidas_empresa on public.crm_rapidas(empresa_id);

create table if not exists public.crm_equipo_chat (
  id text primary key,
  empresa_id text not null references public.crm_empresas(id) on delete cascade,
  de text not null,
  nombre text not null default '',
  texto text not null default '',
  creado timestamptz not null default now(),
  ref jsonb,
  estado text,
  hecho_por text
);
create index if not exists crm_equipo_empresa on public.crm_equipo_chat(empresa_id, creado desc);

create table if not exists public.crm_api_keys (
  id text primary key,
  empresa_id text not null references public.crm_empresas(id) on delete cascade,
  nombre text not null default '',
  prefijo text not null,
  hash text not null unique,           -- sha256 de la clave; la clave no se guarda
  creado timestamptz not null default now(),
  ultimo_uso timestamptz
);
create index if not exists crm_api_keys_empresa on public.crm_api_keys(empresa_id);

create table if not exists public.crm_actividad (
  id text primary key,
  empresa_id text not null references public.crm_empresas(id) on delete cascade,
  quien text not null default '',
  que text not null default '',
  ref jsonb,
  creado timestamptz not null default now()
);
create index if not exists crm_actividad_empresa on public.crm_actividad(empresa_id, creado desc);

create table if not exists public.crm_webhook_log (
  id text primary key,
  empresa_id text,
  objeto text,
  recibido timestamptz not null default now(),
  entrantes int not null default 0,
  estados int not null default 0,
  error text
);
create index if not exists crm_webhook_log_empresa on public.crm_webhook_log(empresa_id, recibido desc);

-- RLS: habilitado y sin políticas → la anon key no ve nada; el servidor
-- usa la service role key, que saltea RLS.
alter table public.crm_empresas enable row level security;
alter table public.crm_miembros enable row level security;
alter table public.crm_invitaciones enable row level security;
alter table public.crm_canales enable row level security;
alter table public.crm_contactos enable row level security;
alter table public.crm_conversaciones enable row level security;
alter table public.crm_mensajes enable row level security;
alter table public.crm_pedidos enable row level security;
alter table public.crm_productos enable row level security;
alter table public.crm_plantillas enable row level security;
alter table public.crm_rapidas enable row level security;
alter table public.crm_equipo_chat enable row level security;
alter table public.crm_api_keys enable row level security;
alter table public.crm_actividad enable row level security;
alter table public.crm_webhook_log enable row level security;

-- Bucket de archivos (fotos, audios, documentos de los chats). Público para
-- que las URLs se puedan abrir desde la bandeja; los nombres llevan un hash.
insert into storage.buckets (id, name, public)
  values ('crm-media', 'crm-media', true)
  on conflict (id) do nothing;
