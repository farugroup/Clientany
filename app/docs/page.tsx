import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ChevronDown } from "lucide-react";
import SitioNav from "@/components/landing/SitioNav";
import SitioPie from "@/components/landing/SitioPie";
import { C, Codigo, Nota, Paso, Pasos, Seccion, Sub, TablaSimple } from "@/components/landing/PiezasDocs";

export const metadata: Metadata = {
  title: "Docs — Clientany · Conectar WhatsApp, Instagram y Messenger, automáticas y API",
  description:
    "Tutoriales paso a paso para conectar WhatsApp Business API, Instagram y Messenger a Clientany, armar las respuestas automáticas, cargar pedidos y stock por CSV y usar la API pública.",
  alternates: { canonical: "/docs" },
};

const BASE = "https://www.clientany.com/api/v1";

const INDICE: { id: string; titulo: string; subs?: { id: string; titulo: string }[] }[] = [
  { id: "empezar", titulo: "Empezar" },
  {
    id: "whatsapp",
    titulo: "Conectar WhatsApp Business API",
    subs: [
      { id: "coexistence", titulo: "Seguir usando el celular" },
      { id: "verificacion", titulo: "Verificar la empresa" },
      { id: "plantillas", titulo: "Plantillas y ventana de 24 hs" },
    ],
  },
  { id: "instagram", titulo: "Conectar Instagram" },
  { id: "messenger", titulo: "Conectar Messenger" },
  { id: "app-activa", titulo: "Publicar la app de Meta" },
  { id: "automaticas", titulo: "Respuestas automáticas" },
  { id: "csv", titulo: "Pedidos y stock por CSV" },
  {
    id: "api",
    titulo: "API pública",
    subs: [
      { id: "api-pedidos", titulo: "Pedidos" },
      { id: "api-productos", titulo: "Stock" },
      { id: "api-contactos", titulo: "Contactos" },
      { id: "api-conversaciones", titulo: "Bandeja" },
      { id: "api-mensajes", titulo: "Mandar mensajes" },
      { id: "webhook", titulo: "Webhook saliente" },
    ],
  },
  { id: "equipo", titulo: "Equipo y roles" },
  { id: "preguntas", titulo: "Preguntas" },
];

function Indice() {
  return (
    <ul className="space-y-0.5 text-sm">
      {INDICE.map((s) => (
        <li key={s.id}>
          <a href={`#${s.id}`} className="block rounded-lg px-3 py-1.5 font-medium text-ink-200 transition hover:bg-ink-850 hover:text-white">
            {s.titulo}
          </a>
          {s.subs && (
            <ul className="mb-1 ml-3 border-l border-ink-800 pl-2">
              {s.subs.map((x) => (
                <li key={x.id}>
                  <a href={`#${x.id}`} className="block rounded-md px-2 py-1 text-[13px] text-ink-400 transition hover:text-white">
                    {x.titulo}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

const LINK = "font-semibold text-brand-300 underline-offset-2 hover:text-brand-200 hover:underline";

export default function Docs() {
  return (
    <div className="min-h-screen overflow-x-clip bg-ink-950 text-ink-100">
      <SitioNav />

      {/* Encabezado */}
      <header className="relative border-b border-ink-800/70">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/2 h-80 w-[820px] -translate-x-1/2 rounded-full bg-brand-500/[0.14] blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 py-12 lg:px-6 lg:py-16">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-500/25 bg-brand-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-200">
            <BookOpen className="h-3.5 w-3.5" /> Docs
          </span>
          <h1 className="mt-4 text-[32px] font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
            Conexiones y tutoriales
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-300 sm:text-lg">
            Todo lo que necesitás para pasar de la demo a tu Clientany conectado de verdad: WhatsApp, Instagram y
            Messenger, las respuestas automáticas, tus pedidos y tu stock, y la API. Escrito para que lo siga alguien que
            no programa (salvo la parte de la API).
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-10 lg:grid lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-12 lg:px-6 lg:py-14">
        {/* Índice: arriba y plegable en el celular, fijo al costado en la compu */}
        <details className="group mb-8 rounded-2xl border border-ink-700/60 bg-ink-900/80 lg:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-white [&::-webkit-details-marker]:hidden">
            En esta página
            <ChevronDown className="h-4 w-4 text-ink-400 transition group-open:rotate-180" />
          </summary>
          <nav className="border-t border-ink-800 px-1 py-2" aria-label="Índice de Docs">
            <Indice />
          </nav>
        </details>
        <aside className="hidden lg:block">
          <nav className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pb-6" aria-label="Índice de Docs">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-ink-500">En esta página</div>
            <Indice />
          </nav>
        </aside>

        <article className="min-w-0 space-y-14">
          {/* ============================== EMPEZAR ============================== */}
          <Seccion id="empezar" titulo="Empezar" bajada="Tres caminos: mirar la demo, crear tu cuenta y sumar a tu equipo.">
            <Sub titulo="1. Probá la demo (sin registrarte)">
              <p>
                Entrá a la{" "}
                <Link href="/inbox" className={LINK}>
                  demo
                </Link>
                : es Clientany completo con chats, clientes, pedidos y stock de ejemplo. Todo queda guardado en tu
                navegador y no sale ningún mensaje real. Podés simular que un cliente escribe y ver qué le contesta el bot,
                mover chats entre grupos, cargar un CSV o armar tus respuestas automáticas.
              </p>
            </Sub>
            <Sub titulo="2. Creá tu cuenta">
              <p>
                En{" "}
                <Link href="/registro" className={LINK}>
                  Empezar gratis
                </Link>{" "}
                te registrás con tu email (o con Google). Se crea tu empresa y arrancan los 14 días de prueba, sin
                tarjeta. Desde ahí, el orden que recomendamos:
              </p>
              <ul className="list-disc space-y-1.5 pl-5 marker:text-brand-400">
                <li>
                  <b className="text-white">Conectá tu WhatsApp</b> (abajo, paso a paso). Es lo que más cambia el día a
                  día.
                </li>
                <li>
                  <b className="text-white">Cargá tus pedidos y tu stock</b> por CSV, para que el bot y tu equipo
                  respondan con datos reales.
                </li>
                <li>
                  <b className="text-white">Poné tu horario</b> en Configuración y revisá las{" "}
                  <b className="text-white">Respuestas automáticas</b>.
                </li>
                <li>
                  <b className="text-white">Invitá a tu equipo.</b>
                </li>
              </ul>
            </Sub>
            <Sub titulo="3. Sumá a tu equipo">
              <p>
                En <b className="text-white">Equipo → Invitar</b> ponés el email de la persona y su rol. Cuando se registra
                con ese mismo email, entra directo a tu empresa. Más detalle en{" "}
                <a href="#equipo" className={LINK}>
                  Equipo y roles
                </a>
                .
              </p>
            </Sub>
          </Seccion>

          {/* ============================== WHATSAPP ============================== */}
          <Seccion
            id="whatsapp"
            titulo="Conectar WhatsApp Business API"
            bajada="Unos 25 minutos. Es la conexión oficial de Meta: sin riesgo de bloqueo por usar herramientas no oficiales."
          >
            <p>
              Necesitás una cuenta de Facebook con acceso al <b className="text-white">portfolio comercial</b> de tu
              empresa (lo que antes se llamaba Business Manager) y un número de teléfono para WhatsApp. Si el número ya lo
              usás en la app WhatsApp Business del celular, leé primero{" "}
              <a href="#coexistence" className={LINK}>
                Seguir usando el celular
              </a>
              .
            </p>
            <Pasos>
              <Paso titulo="Creá la app en Meta for Developers">
                Entrá a <C>developers.facebook.com</C> → <b className="text-ink-100">Mis apps</b> →{" "}
                <b className="text-ink-100">Crear app</b>. Elegí el tipo <b className="text-ink-100">Empresa</b> (o el
                caso de uso «Conectarte con clientes por WhatsApp», según cómo te lo muestre el asistente), ponele un
                nombre (por ejemplo «Clientany Mi Tienda») y asociala a tu portfolio comercial.
              </Paso>
              <Paso titulo="Agregá el producto WhatsApp">
                En el panel de la app: <b className="text-ink-100">Agregar producto → WhatsApp → Configurar</b>. Meta te
                da un número de prueba para hacer los primeros ensayos. Para usar tu número real, en{" "}
                <b className="text-ink-100">WhatsApp → Configuración de la API</b> tocá{" "}
                <b className="text-ink-100">Agregar número de teléfono</b> y verificalo por SMS o llamada.
              </Paso>
              <Paso titulo="Copiá el Phone Number ID y el WABA ID">
                En <b className="text-ink-100">WhatsApp → Configuración de la API</b> vas a ver el{" "}
                <b className="text-ink-100">Identificador del número de teléfono</b> (Phone Number ID) y el{" "}
                <b className="text-ink-100">Identificador de la cuenta de WhatsApp Business</b> (WABA ID). Son dos números
                largos: copialos.
              </Paso>
              <Paso titulo="Generá un token permanente (usuario del sistema)">
                El token que aparece en la pantalla de la API dura 24 horas: sirve para probar, no para trabajar. Para uno
                que no vence: en <C>business.facebook.com/settings</C> → <b className="text-ink-100">Usuarios → Usuarios
                del sistema</b> → <b className="text-ink-100">Agregar</b> (rol Administrador). Asignale los activos (tu app
                y tu cuenta de WhatsApp, con control total) y tocá <b className="text-ink-100">Generar token</b>: elegí tu
                app, vencimiento <b className="text-ink-100">Nunca</b> y los permisos <C>whatsapp_business_messaging</C> y{" "}
                <C>whatsapp_business_management</C>. Copiá el token: Meta lo muestra una sola vez.
              </Paso>
              <Paso titulo="Pegalo en Clientany → Conexiones">
                En <b className="text-ink-100">Conexiones → WhatsApp</b> pegá el Phone Number ID, el WABA ID y el token.
                Opcional pero recomendado: el <b className="text-ink-100">App Secret</b> (en Meta,{" "}
                <b className="text-ink-100">Configuración de la app → Básica → Clave secreta</b>), que sirve para comprobar
                que cada aviso viene de verdad de Meta. Clientany prueba las credenciales contra Meta{" "}
                <b className="text-ink-100">antes de guardarlas</b>: si algo está mal, te dice qué y no guarda nada.
              </Paso>
              <Paso titulo="Configurá el webhook en Meta">
                En Meta: <b className="text-ink-100">WhatsApp → Configuración → Webhook → Editar</b>. Ahí van dos datos
                que copiás desde <b className="text-ink-100">Conexiones</b> en Clientany (cada empresa tiene los suyos):
                <Codigo titulo="webhook">{`URL de devolución de llamada:  https://TU-DOMINIO/api/webhooks/meta/<id de tu empresa>
Token de verificación:          el que te muestra Conexiones`}</Codigo>
                Tocá <b className="text-ink-100">Verificar y guardar</b>. Meta llama a esa URL y Clientany le responde al
                instante si el token coincide.
              </Paso>
              <Paso titulo="Suscribí los eventos">
                En la misma pantalla, en <b className="text-ink-100">Campos del webhook</b>, suscribí{" "}
                <C>messages</C> (mensajes entrantes y estados: enviado, entregado, leído). Si usás el número también en el
                celular (Coexistence), sumá los ecos de lo que mandás desde el teléfono: <C>smb_message_echoes</C> (en
                algunas versiones del panel figura como <C>message_echoes</C>).
              </Paso>
              <Paso titulo="Mandá un mensaje de prueba">
                Desde tu celular, escribile al número conectado. En segundos aparece en la{" "}
                <b className="text-ink-100">Bandeja</b>, y si tenés la bienvenida activa, el bot contesta. Si usás el
                número de prueba de Meta, antes agregá tu celular como destinatario en{" "}
                <b className="text-ink-100">Configuración de la API</b>.
              </Paso>
            </Pasos>
            <Nota tipo="ojo">
              Mientras la app de Meta está <b>en desarrollo</b>, sólo pueden escribir los números y las personas con rol en
              la app. Para atender al público tenés que publicarla: mirá{" "}
              <a href="#app-activa" className={LINK}>
                Publicar la app de Meta
              </a>
              .
            </Nota>

            <Sub id="coexistence" titulo="Seguir usando el celular (Coexistence)">
              <p>
                Meta permite que un mismo número funcione a la vez en la app <b className="text-white">WhatsApp Business</b>{" "}
                del celular y en la API (lo llama Coexistence o coexistencia). Lo que contestás desde el teléfono llega a
                Clientany como eco y queda en el chat, así el equipo ve la conversación completa.
              </p>
              <ul className="list-disc space-y-1.5 pl-5 marker:text-brand-400">
                <li>Funciona con la app WhatsApp Business (no con WhatsApp común) actualizada a la última versión.</li>
                <li>
                  El número se suma a la API desde el flujo de registro de Meta eligiendo conectar tu app de WhatsApp
                  Business existente; se confirma escaneando un código desde el celular.
                </li>
                <li>
                  Suscribí el campo de ecos del webhook (paso 7) para que lo que mandás desde el teléfono aparezca en
                  Clientany.
                </li>
              </ul>
              <Nota>
                Los requisitos, los países habilitados y los pasos exactos los define Meta y pueden cambiar. Si no te
                aparece la opción, escribinos a{" "}
                <a href="mailto:hola@clientany.com" className={LINK}>
                  hola@clientany.com
                </a>{" "}
                y lo vemos juntos. Sin Coexistence, un número conectado a la API deja de funcionar en la app del celular.
              </Nota>
            </Sub>

            <Sub id="verificacion" titulo="Verificar la empresa">
              <p>
                La API funciona sin verificar, pero con límites bajos de conversaciones que podés iniciar por día. Verificar
                la empresa en el portfolio comercial (<b className="text-white">Centro de seguridad → Verificación de la
                empresa</b>) sube esos límites y te permite tener el nombre visible aprobado. Te van a pedir datos de la
                razón social y un documento (constancia de CUIT, una factura de servicio o similar). Suele tardar de uno a
                varios días.
              </p>
            </Sub>

            <Sub id="plantillas" titulo="Plantillas y la ventana de 24 hs">
              <p>
                Cuando un cliente te escribe, se abre una <b className="text-white">ventana de 24 hs</b> para responderle
                con texto libre. Pasado ese plazo, WhatsApp sólo deja mandar <b className="text-white">plantillas</b>{" "}
                aprobadas por Meta. Clientany te muestra cuánto tiempo queda (la franja «podés responder (22 h)») y, si la
                ventana se cerró, en vez del texto te ofrece las plantillas.
              </p>
              <ul className="list-disc space-y-1.5 pl-5 marker:text-brand-400">
                <li>
                  Las plantillas se crean en el <b className="text-white">Administrador de WhatsApp → Plantillas de
                  mensajes</b>. Meta las revisa (a veces en minutos, a veces en horas).
                </li>
                <li>
                  En Clientany, <b className="text-white">Plantillas y rápidas → Sincronizar</b> las trae con su estado
                  (aprobada, pendiente, rechazada).
                </li>
                <li>
                  Meta cobra los mensajes según su tarifa por país y categoría. Lo pagás directo a Meta con el medio de
                  pago de tu cuenta de WhatsApp, como con cualquier herramienta que use la API oficial.
                </li>
              </ul>
            </Sub>
          </Seccion>

          {/* ============================== INSTAGRAM ============================== */}
          <Seccion id="instagram" titulo="Conectar Instagram" bajada="Unos 20 minutos. Usa la misma app de Meta que WhatsApp.">
            <Pasos>
              <Paso titulo="Pasá tu cuenta a profesional y vinculala a tu página">
                Tu Instagram tiene que ser una cuenta <b className="text-ink-100">profesional</b> (Empresa o Creador). Si
                vas a conectarla a través de la página de Facebook, vinculala desde Instagram:{" "}
                <b className="text-ink-100">Configuración → Herramientas para empresas → Conectar o crear página</b>.
              </Paso>
              <Paso titulo="Permití el acceso a los mensajes">
                En la app de Instagram: <b className="text-ink-100">Configuración → Mensajes y respuestas a historias →
                Herramientas conectadas → Permitir el acceso a los mensajes</b>. Sin esto, Meta no entrega los mensajes
                directos a ninguna herramienta.
              </Paso>
              <Paso titulo="Agregá el producto Instagram a tu app de Meta">
                En tu app: <b className="text-ink-100">Agregar producto → Instagram</b>. Podés ir por dos caminos: con{" "}
                <b className="text-ink-100">inicio de sesión de Instagram</b> (no necesita página de Facebook) o a través de
                la <b className="text-ink-100">página de Facebook</b> vinculada.
              </Paso>
              <Paso titulo="Pedí los permisos">
                Para leer y contestar mensajes directos hace falta <C>instagram_manage_messages</C> (o{" "}
                <C>instagram_business_manage_messages</C> si vas con inicio de sesión de Instagram), más los básicos de
                lectura de la cuenta.
              </Paso>
              <Paso titulo="Generá el token y copiá los IDs">
                Con la página de Facebook: generá un <b className="text-ink-100">token de página</b> (para que no venza,
                hacelo desde un usuario del sistema, como en WhatsApp). Con inicio de sesión de Instagram: generá el token
                de la cuenta desde la configuración del producto. Anotá el <b className="text-ink-100">ID de la cuenta de
                Instagram</b> y, si corresponde, el <b className="text-ink-100">ID de la página</b>.
              </Paso>
              <Paso titulo="Pegalo en Clientany → Conexiones → Instagram">
                ID de Instagram, ID de página (si fuiste por la página) y token. Igual que con WhatsApp, se prueba antes de
                guardarse.
              </Paso>
              <Paso titulo="Configurá el webhook">
                En el producto Instagram de tu app, <b className="text-ink-100">Webhooks</b>: la misma URL y el mismo token
                de verificación que te muestra Conexiones. Suscribí el campo <C>messages</C> (y{" "}
                <C>messaging_postbacks</C> si usás botones).
              </Paso>
            </Pasos>
          </Seccion>

          {/* ============================== MESSENGER ============================== */}
          <Seccion id="messenger" titulo="Conectar Messenger" bajada="Unos 15 minutos. Los mensajes de tu página de Facebook, en la misma bandeja.">
            <Pasos>
              <Paso titulo="Agregá el producto Messenger">
                En tu app de Meta: <b className="text-ink-100">Agregar producto → Messenger → Configurar</b>, y conectá tu
                página de Facebook.
              </Paso>
              <Paso titulo="Copiá el Page ID y generá el token de página">
                El <b className="text-ink-100">Page ID</b> lo ves en la configuración de Messenger de la app (o en la
                página: <b className="text-ink-100">Información → Transparencia de la página</b>). Generá un{" "}
                <b className="text-ink-100">token de página</b> con el permiso <C>pages_messaging</C> (y{" "}
                <C>pages_manage_metadata</C> para poder suscribir el webhook). Para que no venza, generalo desde un usuario
                del sistema.
              </Paso>
              <Paso titulo="Pegalo en Clientany → Conexiones → Messenger">Page ID y token. Se prueban antes de guardarse.</Paso>
              <Paso titulo="Configurá el webhook de la página">
                En Messenger → <b className="text-ink-100">Webhooks</b>: misma URL y mismo token de verificación de
                Conexiones. Suscribí la página a <C>messages</C>, <C>messaging_postbacks</C> y <C>message_echoes</C> (este
                último trae lo que respondés desde la bandeja de la página, así queda en el chat).
              </Paso>
            </Pasos>
          </Seccion>

          {/* ============================== APP ACTIVA ============================== */}
          <Seccion id="app-activa" titulo="Publicar la app de Meta (y la URL de privacidad)">
            <p>
              Mientras la app está en modo <b className="text-white">desarrollo</b>, sólo le pueden escribir las personas
              con rol en la app. Para atender a cualquiera:
            </p>
            <Pasos>
              <Paso titulo="Completá la configuración básica">
                En <b className="text-ink-100">Configuración de la app → Básica</b>: ícono, categoría, email de contacto y{" "}
                <b className="text-ink-100">URL de la Política de privacidad</b> (Meta no deja publicar sin ella; a veces
                también pide la de Términos).
              </Paso>
              <Paso titulo="Pedí el acceso avanzado a los permisos">
                Para Instagram y Messenger, en <b className="text-ink-100">Revisión de la app</b> pedí el acceso avanzado
                de <C>instagram_manage_messages</C> y <C>pages_messaging</C>. Meta suele pedir un video corto mostrando el
                uso: grabá la bandeja de Clientany recibiendo y contestando un mensaje.
              </Paso>
              <Paso titulo="Pasá la app a modo Activo">Arriba en el panel de la app, el interruptor de Desarrollo a Activo.</Paso>
            </Pasos>
            <Nota>
              Usá la política de privacidad de tu propia tienda o empresa. Si todavía no tenés una, la de Clientany (
              <Link href="/privacidad" className={LINK}>
                www.clientany.com/privacidad
              </Link>
              ) explica cómo tratamos los mensajes que nos llegan por tu cuenta y te puede servir de referencia, pero lo
              correcto es que tu empresa tenga la suya.
            </Nota>
          </Seccion>

          {/* ============================== AUTOMÁTICAS ============================== */}
          <Seccion
            id="automaticas"
            titulo="Respuestas automáticas"
            bajada="Contestan en segundos lo que se repite todo el día, con tus datos, y se callan cuando corresponde."
          >
            <p>
              Se arman en <b className="text-white">Respuestas automáticas</b>. Cada bloque se prende y se apaga por
              separado, y abajo tenés un simulador para probar qué contestaría el bot sin mandar nada. Cuando llega un
              mensaje, el bot revisa en este orden y responde con el primero que corresponde:
            </p>
            <TablaSimple
              cabecera={["Bloque", "Qué hace"]}
              filas={[
                [<b key="h" className="text-white">Pasar a una persona</b>, "Si el cliente escribe alguna de tus palabras (por ejemplo «persona», «asesor», «humano»), le avisa que lo atiende alguien del equipo y marca el chat como «Necesita una persona». Gana a todo lo demás."],
                [<b key="m" className="text-white">Menú</b>, "Una lista numerada de opciones. Cada opción responde un texto, pasa a una persona, busca el estado del pedido o pregunta qué producto busca."],
                [<b key="r" className="text-white">Reglas</b>, "Si el mensaje tiene ciertas palabras (contiene, es exacto o empieza con), responde tu texto. Se pueden limitar a un canal, a fuera de horario o a una vez por día."],
                [<b key="p" className="text-white">Estado del pedido</b>, "Si pregunta por su pedido (o pasa un número), busca el pedido y le dice el estado, el transporte y el seguimiento."],
                [<b key="s" className="text-white">Stock y precios</b>, "Si pregunta si hay o cuánto sale, busca en tu lista de Stock y contesta con el precio y si hay unidades. Si no lo encuentra, no inventa: lo deja para una persona."],
                [<b key="b" className="text-white">Bienvenida</b>, "El primer mensaje del día (o pasadas 24 hs desde la última), dentro del horario. Si el menú está activo, lo manda después."],
                [<b key="a" className="text-white">Fuera de horario</b>, "Si escriben cuando está cerrado, avisa el horario. Una vez cada 12 hs por chat."],
              ]}
            />
            <p>
              En los textos podés usar <C>{"{marca}"}</C>, <C>{"{nombre}"}</C> y <C>{"{horario}"}</C>; en stock,{" "}
              <C>{"{producto}"}</C>, <C>{"{precio}"}</C> y <C>{"{stock}"}</C>; en pedidos, <C>{"{numero}"}</C>,{" "}
              <C>{"{estado}"}</C>, <C>{"{transporte}"}</C> y <C>{"{seguimiento}"}</C>.
            </p>
            <Sub titulo="Los candados (para no molestar)">
              <ul className="list-disc space-y-1.5 pl-5 marker:text-brand-400">
                <li>La bienvenida sale una vez cada 24 hs por chat; el aviso de fuera de horario, una vez cada 12 hs.</li>
                <li>Hay un tope de respuestas automáticas por chat y por día (de fábrica, 6).</li>
                <li>
                  Si una persona del equipo respondió hace menos de N minutos (de fábrica, 15), el bot se calla. También
                  se calla si alguien tomó el chat con «Lo tomo yo».
                </li>
                <li>Nunca le escribe a quien está en Baja ni en un chat manual.</li>
              </ul>
            </Sub>
          </Seccion>

          {/* ============================== CSV ============================== */}
          <Seccion
            id="csv"
            titulo="Pedidos y stock por CSV"
            bajada="Exportá el CSV de tu tienda o de tu planilla y subilo. Te marca los errores fila por fila antes de importar."
          >
            <p>
              Se importa desde <b className="text-white">Pedidos → Importar</b>, <b className="text-white">Stock →
              Importar</b> y <b className="text-white">Clientes → Importar</b>. El separador puede ser coma o punto y coma,
              las columnas pueden venir en cualquier orden y los encabezados en español o en inglés (sin importar
              mayúsculas ni acentos). Importar dos veces el mismo archivo no duplica: los pedidos se actualizan por número,
              el stock por SKU y los contactos por teléfono o email.
            </p>
            <TablaSimple
              cabecera={["Archivo", "Columnas que entiende", "Obligatorias"]}
              filas={[
                [
                  <b key="p" className="text-white">Pedidos</b>,
                  <C key="pc">numero, fecha, nombre, telefono, email, estado, total, transporte, seguimiento, productos, localidad, cp</C>,
                  "numero o nombre",
                ],
                [
                  <b key="s" className="text-white">Stock</b>,
                  <C key="sc">sku, nombre, precio, stock, minimo, categoria, descripcion, imagen, activo</C>,
                  "sku y nombre",
                ],
                [
                  <b key="c" className="text-white">Contactos</b>,
                  <C key="cc">nombre, telefono, email, documento, direccion, localidad, provincia, cp, notas</C>,
                  "nombre",
                ],
              ]}
            />
            <ul className="list-disc space-y-1.5 pl-5 marker:text-brand-400">
              <li>
                <b className="text-white">estado</b>: pendiente, pagado, en preparación, enviado, entregado, cancelado o
                devuelto (también entiende paid, shipped, delivered…).
              </li>
              <li>
                <b className="text-white">productos</b>: separados por <C>|</C>, con la cantidad adelante o atrás:{" "}
                <C>2 x Sérum Vit. C | Crema de día x 1</C>.
              </li>
              <li>
                <b className="text-white">fecha</b>: <C>dd/mm/aaaa</C> (con hora opcional) o ISO. Los montos aceptan{" "}
                <C>18.900,50</C> o <C>18900.50</C>.
              </li>
              <li>
                <b className="text-white">telefono</b>: como lo tengas; se normaliza solo (en Argentina, agrega el 54 y el
                9).
              </li>
            </ul>
            <Codigo titulo="pedidos.csv">{`numero;fecha;nombre;telefono;email;estado;total;transporte;seguimiento;productos;localidad;cp
LUN-1042;28/09/2026;Sofía Martínez;11 5555-1234;sofia@mail.com;enviado;37800;Andreani;AR-48291;2 x Sérum Vit. C;Palermo;1414
LUN-1043;29/09/2026;Lucas Fernández;+54 9 351 555-0101;lucas@mail.com;pagado;18900;;;Sérum Vit. C x 1;Córdoba;5000`}</Codigo>
            <Codigo titulo="stock.csv">{`sku,nombre,precio,stock,minimo,categoria,activo
SER-VC-30,Sérum Vit. C 30 ml,18900,14,5,Cuidado facial,si
CRE-DIA-50,Crema de día 50 ml,15400,0,3,Cuidado facial,si`}</Codigo>
          </Seccion>

          {/* ============================== API ============================== */}
          <Seccion
            id="api"
            titulo="API pública"
            bajada="Para que tu tienda o tu sistema mantengan pedidos, stock y contactos al día solos, y para mandar mensajes."
          >
            <Sub titulo="Autenticación">
              <p>
                Creá una clave en <b className="text-white">Configuración → API</b> (sólo administradores). El secreto se
                muestra <b className="text-white">una sola vez</b>: guardalo en un lugar seguro. Si se pierde, borrás la
                clave y creás otra. Va en el encabezado <C>X-API-Key</C> (o <C>Authorization: Bearer</C>). Todas las rutas
                cuelgan de:
              </p>
              <Codigo titulo="base">{BASE}</Codigo>
              <Codigo titulo="curl · probar la clave">{`curl ${BASE}/yo \\
  -H "X-API-Key: ck_live_TU_CLAVE"`}</Codigo>
              <Codigo titulo="respuesta">{`{
  "empresa": { "id": "emp_8f2a…", "nombre": "Lunar Cosmética" },
  "key": { "nombre": "Mi tienda", "prefijo": "ck_live_ab12" }
}`}</Codigo>
              <p>
                Los cuerpos van en JSON (<C>Content-Type: application/json</C>). Si algo falla, la respuesta trae{" "}
                <C>{`{ "error": "…" }`}</C> con el código HTTP que corresponde (401 si la clave no sirve, 404 si no existe,
                400 si falta un dato, con un <C>codigo</C> para que tu sistema lo reconozca). Crear o actualizar devuelve 201 con lo
                guardado; si mandás una lista (hasta 500 por llamada), devuelve la lista. Las respuestas de abajo están
                resumidas: traen más campos.
              </p>
            </Sub>

            <Sub id="api-pedidos" titulo="Pedidos">
              <TablaSimple
                cabecera={["Ruta", "Qué hace"]}
                filas={[
                  [<C key="1">GET /pedidos?desde=&estado=</C>, "Lista los pedidos (desde una fecha ISO y/o de un estado)."],
                  [<C key="2">POST /pedidos</C>, "Crea o actualiza uno o una lista. Si el número ya existe, lo actualiza."],
                  [<C key="3">GET /pedidos/:numero</C>, "Un pedido por su número."],
                  [<C key="4">PATCH /pedidos/:numero</C>, "Cambia campos sueltos (estado, envío…)."],
                ]}
              />
              <Codigo titulo="curl · cargar un pedido">{`curl -X POST ${BASE}/pedidos \\
  -H "X-API-Key: ck_live_TU_CLAVE" \\
  -H "Content-Type: application/json" \\
  -d '{
    "numero": "LUN-1042",
    "nombre": "Sofía Martínez",
    "telefono": "+54 9 11 5555-1234",
    "email": "sofia@mail.com",
    "estado": "pagado",
    "total": 37800,
    "items": [{ "sku": "SER-VC-30", "nombre": "Sérum Vit. C", "cantidad": 2, "precio": 18900 }]
  }'`}</Codigo>
              <Codigo titulo="curl · marcarlo enviado">{`curl -X PATCH ${BASE}/pedidos/LUN-1042 \\
  -H "X-API-Key: ck_live_TU_CLAVE" \\
  -H "Content-Type: application/json" \\
  -d '{ "estado": "enviado", "envio": { "transporte": "Andreani", "seguimiento": "AR-48291" } }'`}</Codigo>
              <Codigo titulo="respuesta">{`{
  "numero": "LUN-1042",
  "nombre": "Sofía Martínez",
  "estado": "enviado",
  "total": 37800,
  "moneda": "ARS",
  "envio": { "transporte": "Andreani", "seguimiento": "AR-48291" },
  "contacto_id": "ct_31c…"
}`}</Codigo>
              <Nota tipo="tip">
                Al cargar un pedido, Clientany lo ata solo al cliente por teléfono o email. Así, cuando escribe, su ficha ya
                muestra la compra y el bot puede contestarle el estado. Si el número lleva <C>#</C>, en la URL mandalo
                como <C>%23</C> (por ejemplo <C>/pedidos/%231042</C>).
              </Nota>
            </Sub>

            <Sub id="api-productos" titulo="Stock">
              <TablaSimple
                cabecera={["Ruta", "Qué hace"]}
                filas={[
                  [<C key="1">GET /productos</C>, "Lista tu stock."],
                  [<C key="2">POST /productos</C>, "Crea o actualiza uno o una lista, por SKU."],
                  [<C key="3">PATCH /productos/:sku</C>, "Cambia stock, precio, activo u otros campos de un producto."],
                ]}
              />
              <Codigo titulo="curl · subir la lista">{`curl -X POST ${BASE}/productos \\
  -H "X-API-Key: ck_live_TU_CLAVE" \\
  -H "Content-Type: application/json" \\
  -d '[
    { "sku": "SER-VC-30", "nombre": "Sérum Vit. C 30 ml", "precio": 18900, "stock": 14 },
    { "sku": "CRE-DIA-50", "nombre": "Crema de día 50 ml", "precio": 15400, "stock": 0 }
  ]'`}</Codigo>
              <Codigo titulo="curl · actualizar el stock de uno">{`curl -X PATCH ${BASE}/productos/SER-VC-30 \\
  -H "X-API-Key: ck_live_TU_CLAVE" \\
  -H "Content-Type: application/json" \\
  -d '{ "stock": 12 }'`}</Codigo>
              <Codigo titulo="respuesta">{`{
  "sku": "SER-VC-30",
  "nombre": "Sérum Vit. C 30 ml",
  "precio": 18900,
  "moneda": "ARS",
  "stock": 12,
  "activo": true
}`}</Codigo>
            </Sub>

            <Sub id="api-contactos" titulo="Contactos">
              <TablaSimple
                cabecera={["Ruta", "Qué hace"]}
                filas={[
                  [<C key="1">GET /contactos?q=</C>, "Busca por nombre, teléfono o email."],
                  [<C key="2">POST /contactos</C>, "Crea o actualiza (si ya existe por teléfono o email, lo completa)."],
                ]}
              />
              <Codigo titulo="curl">{`curl -X POST ${BASE}/contactos \\
  -H "X-API-Key: ck_live_TU_CLAVE" \\
  -H "Content-Type: application/json" \\
  -d '{ "nombre": "Sofía Martínez", "telefono": "11 5555-1234", "email": "sofia@mail.com", "localidad": "Palermo" }'`}</Codigo>
              <Codigo titulo="respuesta">{`{
  "id": "ct_31c…",
  "nombre": "Sofía Martínez",
  "telefono": "5491155551234",
  "email": "sofia@mail.com",
  "origen": "api"
}`}</Codigo>
            </Sub>

            <Sub id="api-conversaciones" titulo="Bandeja (lectura)">
              <TablaSimple
                cabecera={["Ruta", "Qué hace"]}
                filas={[
                  [<C key="1">GET /conversaciones?desde=</C>, "Los chats con movimiento desde una fecha ISO."],
                  [<C key="2">GET /conversaciones/:id/mensajes</C>, "Los mensajes de un chat."],
                ]}
              />
              <Codigo titulo="curl">{`curl "${BASE}/conversaciones?desde=2026-10-01T00:00:00Z" \\
  -H "X-API-Key: ck_live_TU_CLAVE"`}</Codigo>
              <Codigo titulo="respuesta">{`[
  {
    "id": "cv_7a1…",
    "canal": "whatsapp",
    "nombre": "Sofía Martínez",
    "identificador": "5491155551234",
    "ultimo_texto": "¿Me pasás el estado del pedido?",
    "ultimo_en": "2026-10-02T12:41:00Z",
    "no_leidos": 2
  }
]`}</Codigo>
            </Sub>

            <Sub id="api-mensajes" titulo="Mandar mensajes por WhatsApp">
              <p>
                <C>POST /mensajes</C> con <C>telefono</C> (o <C>conversacion_id</C>) y <C>texto</C>. Si pasaron más de 24
                hs desde el último mensaje del cliente, WhatsApp no deja mandar texto libre: mandá una{" "}
                <C>plantilla</C> aprobada (si no, vuelve un 400 con <C>ventana_cerrada</C>). Si tenés más de un número,
                elegí cuál con <C>canal_id</C>.
              </p>
              <Codigo titulo="curl · texto (con la ventana abierta)">{`curl -X POST ${BASE}/mensajes \\
  -H "X-API-Key: ck_live_TU_CLAVE" \\
  -H "Content-Type: application/json" \\
  -d '{ "telefono": "+54 9 11 5555-1234", "texto": "¡Hola Sofía! Tu pedido ya salió." }'`}</Codigo>
              <Codigo titulo="curl · plantilla (fuera de la ventana)">{`curl -X POST ${BASE}/mensajes \\
  -H "X-API-Key: ck_live_TU_CLAVE" \\
  -H "Content-Type: application/json" \\
  -d '{
    "telefono": "+54 9 11 5555-1234",
    "plantilla": { "nombre": "pedido_enviado", "idioma": "es_AR", "parametros": ["Sofía", "LUN-1042"] }
  }'`}</Codigo>
              <Codigo titulo="respuesta">{`{
  "id": "msg_9d0…",
  "conversacion_id": "cv_7a1…",
  "direccion": "out",
  "tipo": "plantilla",
  "estado": "enviado"
}`}</Codigo>
            </Sub>

            <Sub id="webhook" titulo="Webhook saliente">
              <p>
                Si cargás una URL en <b className="text-white">Configuración → Webhook saliente</b>, Clientany le hace un{" "}
                <C>POST</C> con JSON por cada mensaje que entra, para que tu sistema se entere al instante:
              </p>
              <Codigo titulo="lo que recibís">{`{
  "evento": "mensaje_entrante",
  "conversacion": { "id": "cv_7a1…", "canal": "whatsapp", "nombre": "Sofía Martínez", "identificador": "5491155551234" },
  "mensaje": { "id": "msg_51b…", "direccion": "in", "tipo": "texto", "texto": "¿Me pasás el estado del pedido?", "creado": "2026-10-02T12:41:00Z" }
}`}</Codigo>
              <p>
                Respondé un 200 rápido. El aviso se intenta una vez y espera hasta 5 segundos; si tu servidor no contesta,
                el mensaje igual queda en la bandeja (no se pierde nada).
              </p>
            </Sub>
          </Seccion>

          {/* ============================== EQUIPO ============================== */}
          <Seccion id="equipo" titulo="Equipo y roles">
            <TablaSimple
              cabecera={["Rol", "Qué puede hacer"]}
              filas={[
                [
                  <b key="a" className="text-white">Administrador</b>,
                  "Todo: atender, y además conectar canales, armar las respuestas automáticas, invitar y quitar personas, crear claves de API y cambiar la configuración y el plan.",
                ],
                [
                  <b key="g" className="text-white">Agente</b>,
                  "Atiende: bandeja, clientes, pedidos y stock, sus respuestas rápidas y el chat del equipo.",
                ],
              ]}
            />
            <ul className="list-disc space-y-1.5 pl-5 marker:text-brand-400">
              <li>
                <b className="text-white">Invitar</b>: en Equipo, email y rol. La persona se registra con ese mismo email y
                entra directo a tu empresa.
              </li>
              <li>
                <b className="text-white">Lo tomo yo</b>: marca el chat como tuyo para que nadie más (ni el bot) se meta.
                Cuando terminás, lo soltás.
              </li>
              <li>
                <b className="text-white">Asignar a…</b>: le pasás el chat a otra persona.
              </li>
              <li>
                <b className="text-white">Chat del equipo</b>: para pasarse casos («fijate este pedido»), con pendientes que
                se marcan como hechos.
              </li>
              <li>
                <b className="text-white">Presencia</b>: ves quién está conectado ahora.
              </li>
              <li>
                <b className="text-white">Nota interna</b>: una franja arriba del chat que el cliente no ve.
              </li>
            </ul>
          </Seccion>

          {/* ============================== PREGUNTAS ============================== */}
          <Seccion id="preguntas" titulo="Preguntas">
            <div className="space-y-3">
              {[
                {
                  q: "No me llegan los mensajes a la bandeja. ¿Qué reviso?",
                  a: "En orden: que el webhook diga «Verificado» en Meta; que esté suscripto el campo messages; que la app esté en modo Activo (o que estés escribiendo desde un número con rol en la app); que el token no sea el temporal de 24 hs; y, en Conexiones, el botón «Probar» del canal.",
                },
                {
                  q: "¿Cuánto cobra Meta por los mensajes?",
                  a: "Depende del país y del tipo de mensaje (marketing, utilidad, servicio). Las respuestas dentro de la ventana de 24 hs que abre el cliente no tienen costo de plantilla; las plantillas sí. Lo cobra Meta directo, no Clientany.",
                },
                {
                  q: "¿Puedo conectar el mismo número a dos herramientas?",
                  a: "No: un número de la API manda sus avisos a una sola app de Meta. Si venís de otra herramienta, desconectalo allá primero (o creá tu propia app y migrá el número).",
                },
                {
                  q: "¿Se puede conectar más de un número?",
                  a: "Sí, según tu plan (1 en Inicial, 3 en Pro, ilimitados en Empresa). Cada número puede quedar atado a una marca.",
                },
                {
                  q: "¿Qué pasa con mis credenciales?",
                  a: "Los tokens de Meta y las claves de IA se guardan cifrados y nunca vuelven a tu navegador: en Conexiones sólo vas a ver «token cargado».",
                },
              ].map((p) => (
                <details key={p.q} className="group rounded-xl border border-ink-700/60 bg-ink-900/80 open:border-brand-500/30">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 text-[15px] font-semibold text-white [&::-webkit-details-marker]:hidden">
                    {p.q}
                    <ChevronDown className="h-4 w-4 shrink-0 text-ink-400 transition group-open:rotate-180" />
                  </summary>
                  <p className="px-4 pb-4 text-sm leading-relaxed text-ink-300">{p.a}</p>
                </details>
              ))}
            </div>
            <p>
              ¿Algo no está acá? Escribinos a{" "}
              <a href="mailto:hola@clientany.com" className={LINK}>
                hola@clientany.com
              </a>
              . Los pasos de Meta cambian cada tanto: si una pantalla no coincide, avisanos y lo actualizamos.
            </p>
          </Seccion>
        </article>
      </div>

      <SitioPie />
    </div>
  );
}
