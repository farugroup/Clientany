# Clientany · Análisis de precio

> Cuánto cobra la competencia, cuánto nos cuesta atender a cada cliente, y
> por qué los planes quedan en US$ 29 / 79 / 149. Fecha: octubre de 2026.
> Los precios ajenos salen de sus sitios y de comparativas públicas; pueden
> cambiar: revisar cada tres meses.

## 1. Qué cobra la competencia (octubre 2026)

| Herramienta | Entrada | Qué incluye la entrada | Lo que no te cuentan |
|---|---|---|---|
| **Whaticket** | ~49 € / mes | 3 agentes, chatbot básico, CRM integrado | Sin API nativa; WhatsApp por QR en muchos planes (riesgo de baneo); el costo por conversación de Meta va aparte |
| **Leadsales** | US$ 97 / mes (Básico) | 3 usuarios, 5 embudos, 5.000 conversaciones en embudos, WhatsApp + Facebook + Instagram | El plan con WhatsApp Business API es el Profesional, más caro; sin mensajes masivos por etapa en Básico |
| **Kommo** | US$ 15 / usuario / mes (Base), US$ 25 (Advanced) | Bandeja unificada, pipeline kanban; Salesbot recién en Advanced | **Mínimo 6 meses por adelantado**, no hay mensual; con 5 usuarios Advanced son US$ 125/mes × 6 = US$ 750 de entrada |
| **Callbell** | US$ 15 / usuario / mes | Bandeja multiagente | WhatsApp **US$ 54** extra, Instagram **US$ 22** extra, bot **US$ 22** extra: 3 usuarios + WA + IG + bot ≈ US$ 143/mes |

Lectura: el mercado cobra entre **US$ 50 y US$ 150 por mes** para un equipo
chico con WhatsApp API, Instagram y bot, y lo esconde en add-ons o en
mínimos de contrato. El precio de referencia mental del cliente es «unos
50 dólares».

## 2. Qué nos cuesta un cliente

Costos variables por empresa activa (estimación conservadora):

| Rubro | Base | Costo mensual estimado |
|---|---|---|
| Vercel (funciones, ancho de banda) | plan Pro compartido, ~1–3 % por cliente | US$ 0,5 – 1,5 |
| Supabase (Postgres + storage de medios) | plan Pro compartido; ~200 MB de medios por cliente mediano | US$ 0,5 – 2 |
| IA (sugerencias con Claude Opus 5.5) | ~1.500 tokens de entrada + 150 de salida por sugerencia; 300 sugerencias/mes | ≈ US$ 2,7 (US$ 4 / 1M entrada, US$ 20 / 1M salida); con caché de prompt, menos |
| Mails transaccionales (Resend) | 1.000 mails/mes | US$ 0 – 1 |
| Soporte (tiempo de una persona) | 20 min/mes por cliente promedio | US$ 3 – 5 |
| **Total por cliente activo** | | **≈ US$ 7 – 12** |

Costo por conversación de WhatsApp (Meta): **lo paga la empresa en su
propia cuenta de Meta**, como con cualquier herramienta de API oficial. No
es ingreso ni costo nuestro: hay que decirlo claro en la landing y en el
onboarding para que no sorprenda.

Costo fijo (no cambia con la cantidad de clientes): dominio, Vercel Pro
(US$ 20), Supabase Pro (US$ 25), herramientas (~US$ 30), Meta Business
verificada. ≈ US$ 100/mes.

Punto de equilibrio con el mix de planes de abajo: **~6 clientes pagos**.

## 3. Planes y margen

| Plan | Precio mensual | Para quién | Costo estimado | Margen bruto |
|---|---|---|---|---|
| **Inicial** | **US$ 29** | 1 número de WhatsApp API + IG + Messenger, 3 usuarios, 1 marca, bot completo, pedidos/stock por CSV, 1.000 conversaciones/mes, IA con clave propia | US$ 5 – 8 | ~75 % |
| **Pro** (el que empujamos) | **US$ 79** | 3 números, 10 usuarios, 3 marcas, API + webhook, IA incluida, plantillas sincronizadas, 5.000 conversaciones/mes, soporte por WhatsApp | US$ 10 – 15 | ~83 % |
| **Empresa** | **US$ 149** | Ilimitado (números, usuarios, marcas, conversaciones), onboarding asistido, soporte prioritario, migración desde Whaticket/Kommo | US$ 20 – 35 | ~80 % |

Anual: **20 % de descuento** (Inicial US$ 278, Pro US$ 758, Empresa
US$ 1.430 por año). Mejora la caja y baja la baja (churn) de los que
«prueban un mes».

Por qué estos números:
- **US$ 29** queda por debajo del ancla mental («unos 50»), por debajo de
  Whaticket (49 €) y muy por debajo de Leadsales (97). Es el plan para
  entrar sin pensar: una venta perdida por semana lo paga.
- **US$ 79** es el precio «serio» para un equipo de 5 a 10 con API e IA:
  menos que Callbell con add-ons (≈143) y que Kommo Advanced ×5 (125) sin
  el mínimo de 6 meses. Va destacado como «el más elegido» en la landing.
- **US$ 149** es el techo para distribuidoras y multimarca grandes; incluye
  servicio (onboarding, migración), que es lo que esos clientes pagan.

Qué separa los planes (las palancas de upgrade): cantidad de **números**,
de **usuarios**, de **marcas**, de **conversaciones por mes**, la **API** y
la **IA incluida**. Nunca separamos por funciones de la bandeja: el plan
Inicial tiene el mismo CRM; si no, el producto parece mutilado.

## 4. Argentina: cómo cobrar

- Precio en **dólares** (como todo el mercado), facturado en pesos al
  cambio del día o en USD por Mercado Pago/transferencia internacional.
  Mostrar el equivalente en pesos en la página de pago, no en la landing.
- Para empresas argentinas, factura A con IVA aparte («más impuestos» en la
  landing).
- Primeros 20 clientes: **precio fundador** (Pro a US$ 49 por 12 meses) a
  cambio de testimonio y caso de uso. Reemplaza a los testimonios
  inventados que NO vamos a usar.

## 5. Prueba gratis y conversión

- 14 días, sin tarjeta, con todo el plan Pro habilitado (así prueban la IA
  y la API). Al día 10 y al 13, mail y aviso en el panel («Tu prueba
  termina el…»). Al vencer, la cuenta queda en **sólo lectura** (no se
  borra nada 30 días): el miedo a perder los chats convierte más que un
  descuento.
- La demo sin registro (modo demo) es el primer escalón: no gasta nada
  nuestro (vive en el navegador) y filtra curiosos.
- Métrica a mirar: **conectó su WhatsApp dentro de la prueba** → si lo
  conectó, convierte; si no, el onboarding tiene que empujar eso antes que
  nada (tutorial, llamada de 15 min en Empresa).

## 6. Riesgos y cuándo mover los precios

- **Meta cambia las tarifas por conversación**: no nos afecta directo, pero
  sí la percepción de «WhatsApp es caro». Mantener la explicación en Docs.
- **Costo de la IA**: si el uso promedio supera 1.000 sugerencias/mes por
  cliente, poner un tope blando en Pro (2.000/mes) antes que subir precio.
- **Tipo de cambio**: cobrar en USD protege; si el peso se dispara, ofrecer
  el anual en pesos a 90 días.
- **Subir precios**: recién con 50 clientes y churn mensual < 4 %. Los
  clientes existentes conservan su precio 12 meses (se dice al subir).

## 7. Fuentes (consultadas 02/10/2026)

- Whaticket: comparativa Aurora Inbox 2026 (49 € con 3 agentes, sin API nativa).
- Leadsales: página de planes (Básico US$ 97 / 3 usuarios / 5.000 conversaciones).
- Kommo: Folk y Aurora Inbox (US$ 15 Base, US$ 25 Advanced, mínimo 6 meses).
- Callbell: Aurora Inbox vs Callbell (US$ 15/usuario + WhatsApp US$ 54 + Instagram US$ 22 + bot US$ 22).
- Claude API: precios de lista Opus 5.5 US$ 4 / US$ 20 por millón de tokens.
