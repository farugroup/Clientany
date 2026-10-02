import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import PaginaTexto from "@/components/landing/PaginaTexto";
import { Nota, Seccion, TablaSimple } from "@/components/landing/PiezasDocs";

export const metadata: Metadata = {
  title: "Política de privacidad — Clientany",
  description:
    "Qué datos guarda Clientany, para qué los usa, con quién los comparte, cómo los protege y cómo pedir que los borremos. Ley 25.326 de Protección de los Datos Personales.",
  alternates: { canonical: "/privacidad" },
};

const INDICE = [
  { id: "quienes", titulo: "Quiénes somos" },
  { id: "roles", titulo: "Tus datos y los de tus clientes" },
  { id: "que-datos", titulo: "Qué datos guardamos" },
  { id: "para-que", titulo: "Para qué los usamos" },
  { id: "proveedores", titulo: "Con quién los compartimos" },
  { id: "meta", titulo: "Datos de Meta" },
  { id: "seguridad", titulo: "Cómo los protegemos" },
  { id: "plazos", titulo: "Cuánto tiempo los guardamos" },
  { id: "borrar-datos", titulo: "Cómo pedir que los borremos" },
  { id: "derechos", titulo: "Tus derechos (Ley 25.326)" },
  { id: "cookies", titulo: "Cookies y almacenamiento" },
  { id: "cambios", titulo: "Cambios y contacto" },
];

const LINK = "font-semibold text-brand-300 underline-offset-2 hover:text-brand-200 hover:underline";
const LISTA = "list-disc space-y-1.5 pl-5 marker:text-brand-400";

export default function Privacidad() {
  return (
    <PaginaTexto
      etiqueta="Privacidad"
      icono={ShieldCheck}
      titulo="Política de privacidad"
      bajada="Qué datos guardamos cuando usás Clientany, para qué, con quién los compartimos y cómo podés pedir que los borremos. Sin vueltas."
      actualizado="2 de octubre de 2026"
      indice={INDICE}
    >
      <Seccion id="quienes" titulo="Quiénes somos">
        <p>
          Clientany es un servicio en la nube (software como servicio) que permite a las empresas atender los mensajes de
          sus clientes de WhatsApp, Instagram y Messenger desde una sola bandeja, junto con sus pedidos y su stock. Esta
          política se aplica al sitio <b className="text-white">www.clientany.com</b>, a la aplicación y a la API.
        </p>
        <p>
          Para cualquier consulta sobre tus datos escribinos a{" "}
          <a href="mailto:hola@clientany.com" className={LINK}>
            hola@clientany.com
          </a>
          .
        </p>
      </Seccion>

      <Seccion id="roles" titulo="Tus datos y los de tus clientes">
        <p>Tratamos dos tipos de datos, con responsabilidades distintas:</p>
        <ul className={LISTA}>
          <li>
            <b className="text-white">Los de las empresas que usan Clientany y sus usuarios</b> (nombre, email, datos de
            la empresa, plan). Acá Clientany es el <b className="text-white">responsable</b> de esos datos.
          </li>
          <li>
            <b className="text-white">Los de los clientes de esas empresas</b> (las personas que les escriben por WhatsApp,
            Instagram o Messenger, y los contactos y pedidos que la empresa carga). Acá la empresa es la responsable y
            Clientany los trata <b className="text-white">por cuenta y orden de la empresa</b>, sólo para prestarle el
            servicio. Si sos cliente de una empresa que usa Clientany y querés ejercer tus derechos, lo más rápido es
            pedírselo a esa empresa; si nos escribís a nosotros, se lo hacemos llegar y la ayudamos a resolverlo.
          </li>
        </ul>
      </Seccion>

      <Seccion id="que-datos" titulo="Qué datos guardamos">
        <TablaSimple
          cabecera={["Qué", "Ejemplos"]}
          filas={[
            ["Cuenta", "Nombre, email, contraseña (la guarda nuestro proveedor de autenticación de forma cifrada; nosotros no la vemos), rol en la empresa."],
            ["Empresa", "Nombre, rubro, país, moneda, horario de atención, plan, configuración de las respuestas automáticas."],
            ["Lo que carga la empresa", "Contactos, pedidos, stock, plantillas, respuestas rápidas, notas y etiquetas."],
            ["Mensajes", "Los mensajes y archivos que entran y salen por los canales conectados, con su fecha y estado (enviado, entregado, leído)."],
            ["Credenciales", "Tokens de Meta y claves de IA de la empresa, siempre cifrados. Las claves de la API pública se guardan sólo como un resumen (hash)."],
            ["Datos técnicos", "Registros del servidor (fecha, ruta, dirección IP, navegador) para seguridad y para resolver errores."],
            ["Formulario de contacto", "Si nos dejás tus datos en la página: nombre, email, WhatsApp y cuántos canales atendés."],
          ]}
        />
        <p>
          En el <b className="text-white">modo demo</b> (la demo que se abre sin registrarse) todo queda en el
          almacenamiento de tu navegador: no nos llega nada ni sale ningún mensaje real.
        </p>
      </Seccion>

      <Seccion id="para-que" titulo="Para qué los usamos">
        <ul className={LISTA}>
          <li>Prestar el servicio: recibir y mandar mensajes, mostrar el historial, la ficha del cliente, los pedidos y el stock.</li>
          <li>Correr las respuestas automáticas que configuró la empresa.</li>
          <li>
            Generar sugerencias de respuesta con IA, <b className="text-white">sólo cuando alguien las pide</b>: en ese
            momento mandamos al proveedor de IA el contexto necesario (la conversación, y si corresponde los pedidos y el
            stock relacionados).
          </li>
          <li>Darte soporte, avisarte cosas del servicio (por ejemplo, que termina tu prueba) y facturar.</li>
          <li>Cuidar la seguridad, prevenir abusos y cumplir obligaciones legales.</li>
        </ul>
        <Nota>
          No vendemos datos personales, no los usamos para publicidad y no usamos los mensajes de tus clientes para
          entrenar modelos de IA.
        </Nota>
      </Seccion>

      <Seccion id="proveedores" titulo="Con quién los compartimos">
        <p>Sólo con los proveedores que necesitamos para que el servicio funcione, y para eso:</p>
        <TablaSimple
          cabecera={["Proveedor", "Para qué", "Dónde"]}
          filas={[
            ["Supabase", "Base de datos, archivos y autenticación", "São Paulo, Brasil"],
            ["Vercel", "Alojamiento de la aplicación y la API", "Red global"],
            ["Meta Platforms", "WhatsApp, Instagram y Messenger, cuando la empresa conecta sus canales", "Según Meta"],
            ["Anthropic", "Sugerencias de respuesta con IA, si la empresa las usa", "Estados Unidos"],
            ["Resend", "Emails del servicio (bienvenida, avisos)", "Estados Unidos"],
          ]}
        />
        <p>
          Por eso algunos datos pueden alojarse fuera de la Argentina. Elegimos proveedores que ofrecen medidas de
          seguridad y de confidencialidad adecuadas. También podemos compartir datos si una autoridad competente lo exige
          conforme a la ley.
        </p>
      </Seccion>

      <Seccion id="meta" titulo="Datos que recibimos de Meta">
        <p>
          Cuando una empresa conecta su WhatsApp Business, su Instagram o su página de Facebook, recibimos de Meta los
          mensajes de sus clientes y los datos básicos de perfil que Meta comparte (nombre visible, identificador). Los
          usamos <b className="text-white">sólo para prestarle el servicio a esa empresa</b>, de acuerdo con los Términos
          de la Plataforma de Meta y sus Políticas para Desarrolladores:
        </p>
        <ul className={LISTA}>
          <li>No los vendemos, no los usamos para publicidad ni los compartimos con otras empresas.</li>
          <li>Los tokens de acceso se guardan cifrados y nunca se muestran en el navegador.</li>
          <li>
            Si la empresa desconecta un canal, borramos sus credenciales; si cierra la cuenta, borramos sus datos según
            los plazos de abajo.
          </li>
        </ul>
      </Seccion>

      <Seccion id="seguridad" titulo="Cómo los protegemos">
        <ul className={LISTA}>
          <li>
            <b className="text-white">Cada empresa está aislada:</b> todas las consultas se hacen dentro de la empresa del
            usuario que tiene la sesión; nadie de otra cuenta puede ver tus chats ni tus clientes.
          </li>
          <li>
            <b className="text-white">Credenciales cifradas</b> (AES-256-GCM) para los tokens de Meta y las claves de IA, y
            claves de API guardadas sólo como hash.
          </li>
          <li>Conexiones siempre por HTTPS y acceso a la aplicación con sesión.</li>
          <li>Verificamos la firma de los avisos de Meta cuando la empresa carga su App Secret.</li>
        </ul>
        <p>
          Ningún sistema es invulnerable. Si detectamos un incidente que afecte tus datos, te avisamos sin demoras
          injustificadas y te contamos qué pasó y qué hicimos.
        </p>
      </Seccion>

      <Seccion id="plazos" titulo="Cuánto tiempo los guardamos">
        <ul className={LISTA}>
          <li>Mientras la cuenta esté activa, guardamos los datos para prestar el servicio.</li>
          <li>
            Si la prueba termina sin elegir un plan o si cancelás, la cuenta queda en sólo lectura y conservamos los datos{" "}
            <b className="text-white">30 días</b> para que puedas exportarlos o volver. Después se borran.
          </li>
          <li>Si pedís la baja definitiva, los borramos antes, salvo lo que la ley nos obligue a conservar (por ejemplo, datos de facturación).</li>
          <li>Los registros técnicos se guardan por un tiempo limitado, sólo para seguridad y diagnóstico.</li>
        </ul>
      </Seccion>

      <Seccion id="borrar-datos" titulo="Cómo pedir que borremos tus datos">
        <ul className={LISTA}>
          <li>
            <b className="text-white">Si sos una empresa usuaria:</b> desde Configuración podés exportar tus datos y pedir
            la baja de la cuenta, o escribirnos a{" "}
            <a href="mailto:hola@clientany.com?subject=Borrar%20mis%20datos" className={LINK}>
              hola@clientany.com
            </a>{" "}
            desde el email de un administrador.
          </li>
          <li>
            <b className="text-white">Si sos cliente de una empresa que usa Clientany</b> (por ejemplo, le escribiste por
            WhatsApp): pedíselo a esa empresa, o escribinos indicando a qué empresa le escribiste y tu número o usuario.
            Coordinamos con la empresa y te confirmamos cuando esté hecho.
          </li>
        </ul>
        <p>Respondemos dentro de los plazos de la Ley 25.326 (ver abajo).</p>
      </Seccion>

      <Seccion id="derechos" titulo="Tus derechos (Ley 25.326)">
        <p>
          Podés pedir acceso, rectificación, actualización o supresión de tus datos personales escribiendo a{" "}
          <a href="mailto:hola@clientany.com" className={LINK}>
            hola@clientany.com
          </a>
          . Respondemos los pedidos de acceso dentro de los 10 días corridos y los de rectificación, actualización o
          supresión dentro de los 5 días hábiles.
        </p>
        <p className="text-sm text-ink-400">
          El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma
          gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto conforme lo
          establecido en el artículo 14, inciso 3 de la Ley N° 25.326. La Agencia de Acceso a la Información Pública, en
          su carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que
          interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de
          protección de datos personales.
        </p>
      </Seccion>

      <Seccion id="cookies" titulo="Cookies y almacenamiento del navegador">
        <p>
          Usamos sólo las cookies necesarias para mantener tu sesión iniciada, y el almacenamiento local del navegador para
          el modo demo y para recordar preferencias (por ejemplo, la marca que elegiste). No usamos cookies de publicidad de
          terceros.
        </p>
      </Seccion>

      <Seccion id="cambios" titulo="Cambios y contacto">
        <p>
          Si cambiamos esta política de forma importante, te avisamos por email o dentro de la aplicación antes de que
          entre en vigencia. Clientany no está dirigido a menores de 18 años.
        </p>
        <p>
          Consultas:{" "}
          <a href="mailto:hola@clientany.com" className={LINK}>
            hola@clientany.com
          </a>
          . Mirá también los{" "}
          <Link href="/terminos" className={LINK}>
            Términos y condiciones
          </Link>
          .
        </p>
      </Seccion>
    </PaginaTexto>
  );
}
