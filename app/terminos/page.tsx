import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
import PaginaTexto from "@/components/landing/PaginaTexto";
import { Nota, Seccion } from "@/components/landing/PiezasDocs";

export const metadata: Metadata = {
  title: "Términos y condiciones — Clientany",
  description:
    "Las reglas de uso de Clientany: la prueba gratis, los planes y el pago, el uso aceptable de WhatsApp, Instagram y Messenger, tus datos, la baja de la cuenta y la ley aplicable.",
  alternates: { canonical: "/terminos" },
};

const INDICE = [
  { id: "aceptacion", titulo: "Aceptación" },
  { id: "servicio", titulo: "El servicio" },
  { id: "cuenta", titulo: "Tu cuenta y tu equipo" },
  { id: "planes", titulo: "Prueba, planes y pago" },
  { id: "uso", titulo: "Uso aceptable" },
  { id: "terceros", titulo: "Meta y otros servicios" },
  { id: "ia", titulo: "Inteligencia artificial" },
  { id: "datos", titulo: "Tus datos" },
  { id: "disponibilidad", titulo: "Disponibilidad y soporte" },
  { id: "responsabilidad", titulo: "Responsabilidad" },
  { id: "baja", titulo: "Baja de la cuenta" },
  { id: "ley", titulo: "Cambios y ley aplicable" },
];

const LINK = "font-semibold text-brand-300 underline-offset-2 hover:text-brand-200 hover:underline";
const LISTA = "list-disc space-y-1.5 pl-5 marker:text-brand-400";

export default function Terminos() {
  return (
    <PaginaTexto
      etiqueta="Términos"
      icono={FileText}
      titulo="Términos y condiciones"
      bajada="Las reglas para usar Clientany. Las escribimos en criollo para que se entiendan; si algo no queda claro, preguntanos."
      actualizado="2 de octubre de 2026"
      indice={INDICE}
    >
      <Seccion id="aceptacion" titulo="Aceptación">
        <p>
          Al crear una cuenta o usar Clientany (el sitio <b className="text-white">www.clientany.com</b>, la aplicación y
          la API) aceptás estos términos y la{" "}
          <Link href="/privacidad" className={LINK}>
            Política de privacidad
          </Link>
          . Si los aceptás en nombre de una empresa, declarás que tenés facultades para hacerlo.
        </p>
      </Seccion>

      <Seccion id="servicio" titulo="El servicio">
        <p>
          Clientany es un CRM en la nube para atender en una sola bandeja los mensajes de WhatsApp Business (por la API
          oficial de Meta), Instagram y Messenger, con la ficha de cada cliente, sus pedidos, el stock, respuestas
          automáticas, plantillas, sugerencias con IA, trabajo en equipo y una API pública. La{" "}
          <b className="text-white">demo</b> funciona sin registro, con datos de ejemplo guardados en tu navegador y sin
          mandar mensajes reales.
        </p>
        <p>Podemos mejorar, cambiar o dejar de ofrecer funciones. Si un cambio te quita algo importante de tu plan, te avisamos antes.</p>
      </Seccion>

      <Seccion id="cuenta" titulo="Tu cuenta y tu equipo">
        <ul className={LISTA}>
          <li>Los datos de registro tienen que ser verdaderos y estar al día.</li>
          <li>Sos responsable de cuidar tus contraseñas, los tokens que cargás y las claves de la API.</li>
          <li>
            Los administradores de la empresa deciden quién entra y con qué rol, y responden por el uso que hacen las
            personas que invitan.
          </li>
          <li>Si sospechás un acceso indebido, avisanos enseguida a hola@clientany.com.</li>
        </ul>
      </Seccion>

      <Seccion id="planes" titulo="Prueba, planes y pago">
        <ul className={LISTA}>
          <li>
            <b className="text-white">Prueba:</b> 14 días gratis, sin tarjeta. Al terminar, si no elegiste un plan, la
            cuenta pasa a sólo lectura y tus datos se conservan 30 días.
          </li>
          <li>
            <b className="text-white">Precios:</b> en dólares estadounidenses, más los impuestos que correspondan. El pago
            es mensual o anual (el anual tiene un 20 % de descuento) y se renueva solo al final de cada período, hasta que
            canceles.
          </li>
          <li>
            <b className="text-white">Límites del plan:</b> cada plan tiene una cantidad de números de WhatsApp, usuarios,
            marcas y conversaciones por mes. Si te pasás, te avisamos para que elijas el plan que corresponde.
          </li>
          <li>
            <b className="text-white">Cambios de precio:</b> te avisamos con al menos 30 días de anticipación, y rigen
            desde el período siguiente.
          </li>
          <li>
            <b className="text-white">Costos de Meta:</b> los mensajes que cobra Meta por WhatsApp no están incluidos en el
            plan; los pagás directo a Meta desde tu cuenta.
          </li>
        </ul>
      </Seccion>

      <Seccion id="uso" titulo="Uso aceptable">
        <p>Al usar Clientany te comprometés a:</p>
        <ul className={LISTA}>
          <li>
            Cumplir las políticas de Meta: los Términos de la Plataforma, las Condiciones de WhatsApp Business, la Política
            de Mensajería y la Política de Comercio, y las reglas de Instagram y Messenger.
          </li>
          <li>Escribir sólo a quien te dio su consentimiento, y respetar a quien pide no recibir más mensajes (la «Baja» de la bandeja).</li>
          <li>No mandar spam, contenido ilegal, engañoso, ofensivo ni que infrinja derechos de terceros.</li>
          <li>No intentar acceder a datos de otras empresas, vulnerar la seguridad ni sobrecargar el servicio o la API.</li>
        </ul>
        <p>
          Si detectamos un uso que va contra estos términos o que pone en riesgo el servicio o a otras empresas, podemos
          suspender la cuenta. Salvo urgencia, te avisamos antes y te damos la oportunidad de corregirlo.
        </p>
      </Seccion>

      <Seccion id="terceros" titulo="Meta y otros servicios de terceros">
        <p>
          WhatsApp, Instagram y Messenger son servicios de Meta Platforms, que tiene sus propios términos, aprobaciones y
          límites. Clientany no controla esos servicios: si Meta rechaza una plantilla, limita o bloquea un número, cambia
          sus tarifas o tiene una caída, eso queda fuera de nuestro alcance, aunque siempre te vamos a ayudar a entender qué
          pasó. Lo mismo vale para los demás proveedores que usamos (ver la Política de privacidad).
        </p>
      </Seccion>

      <Seccion id="ia" titulo="Inteligencia artificial">
        <p>
          Las sugerencias de la IA se arman con los datos de tu empresa, pero pueden tener errores. Están pensadas para que
          una persona las revise antes de mandarlas. Las respuestas automáticas del bot contestan sólo lo que configuraste
          (textos, reglas, stock y pedidos cargados). Sos responsable de lo que se manda a tus clientes desde tu cuenta.
        </p>
      </Seccion>

      <Seccion id="datos" titulo="Tus datos">
        <p>
          Los datos que cargás y los mensajes de tus clientes son tuyos. Nos das el permiso necesario para guardarlos y
          procesarlos sólo para prestarte el servicio, como se explica en la{" "}
          <Link href="/privacidad" className={LINK}>
            Política de privacidad
          </Link>
          . Podés exportar tus contactos, pedidos y stock en CSV cuando quieras.
        </p>
        <p>
          Sos responsable de tener la base legal para tratar los datos de tus clientes (por ejemplo, su consentimiento) y
          de informarles que usás herramientas como Clientany para atenderlos.
        </p>
      </Seccion>

      <Seccion id="disponibilidad" titulo="Disponibilidad y soporte">
        <p>
          Hacemos todo lo razonable para que Clientany funcione siempre, pero puede haber interrupciones por mantenimiento,
          fallas de proveedores o causas ajenas. Cuando hagamos un mantenimiento programado que afecte el uso, lo avisamos
          antes. El soporte es por email en todos los planes, por WhatsApp en Pro y prioritario en Empresa.
        </p>
      </Seccion>

      <Seccion id="responsabilidad" titulo="Responsabilidad">
        <p>
          El software y la marca Clientany son nuestros; usarlos no te da ningún derecho sobre ellos más allá de este
          servicio. En la medida en que la ley lo permita, Clientany no responde por daños indirectos ni por lucro cesante
          (por ejemplo, ventas que no se concretaron), y su responsabilidad total queda limitada a lo que hayas pagado por
          el servicio en los 12 meses anteriores al hecho.
        </p>
      </Seccion>

      <Seccion id="baja" titulo="Baja de la cuenta">
        <ul className={LISTA}>
          <li>
            Podés cancelar cuando quieras, por el mismo medio por el que te diste de alta (desde Configuración) o
            escribiendo a hola@clientany.com. No hay permanencia mínima.
          </li>
          <li>La cuenta sigue activa hasta el final del período que ya pagaste; no se cobran nuevos períodos.</li>
          <li>Después, queda en sólo lectura 30 días para que exportes lo que necesites, y luego se borran los datos.</li>
          <li>Al dar de baja la cuenta, borramos los tokens de Meta y desconectamos tus canales.</li>
        </ul>
      </Seccion>

      <Seccion id="ley" titulo="Cambios y ley aplicable">
        <p>
          Si cambiamos estos términos de forma importante, te avisamos por email o dentro de la aplicación con
          anticipación. Si seguís usando Clientany después de que entren en vigencia, se entienden aceptados; si no estás
          de acuerdo, podés darte de baja.
        </p>
        <p>
          Estos términos se rigen por las leyes de la República Argentina. Ante cualquier diferencia, primero intentamos
          resolverla charlando; si no se puede, son competentes los tribunales ordinarios de la Ciudad Autónoma de Buenos
          Aires, salvo que una norma de orden público disponga otra cosa.
        </p>
        <Nota>
          ¿Dudas sobre estos términos? Escribinos a{" "}
          <a href="mailto:hola@clientany.com" className={LINK}>
            hola@clientany.com
          </a>
          .
        </Nota>
      </Seccion>
    </PaginaTexto>
  );
}
