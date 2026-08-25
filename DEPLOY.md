# 🚀 Publicar Clientany en Vercel (gratis, ~5 minutos)

Esta guía es para publicar el CRM en internet **sin instalar nada** en tu computadora.
Al terminar vas a tener un link tipo `https://clientany.vercel.app` que podés abrir desde la
compu o el celular, y compartir con quien quieras.

> No necesitás saber programar. Solo seguí los pasos en orden.

---

## Antes de empezar

- Tené a mano el usuario de **GitHub** donde está el proyecto (`farugroup/Clientany`).
- El proyecto ya está **listo para deploy**: no hay que tocar ninguna configuración.

---

## Opción A — La más rápida (botón de 1 clic)

1. Abrí este link (o tocá el botón **"Deploy with Vercel"** del README):

   👉 https://vercel.com/new/clone?repository-url=https://github.com/farugroup/Clientany/tree/claude/crm-multicanal-ecommerce-o236ay

2. Vercel te va a pedir **iniciar sesión** → elegí **"Continue with GitHub"** y autorizá.
3. Te va a pedir permiso para acceder al repositorio `Clientany` → aceptá.
4. Dejá todo como viene y tocá **"Deploy"**.
5. Esperá 1–2 minutos. Cuando aparezca la pantalla con confeti 🎉, tocá **"Continue to Dashboard"**
   o **"Visit"** y ¡listo! Ese es tu link.

---

## Opción B — Paso a paso desde cero (si preferís hacerlo a mano)

### 1. Crear la cuenta en Vercel
- Entrá a **https://vercel.com** y tocá **"Sign Up"**.
- Elegí **"Continue with GitHub"** e iniciá sesión con tu cuenta de GitHub.
- Autorizá a Vercel cuando te lo pida (es seguro, es el flujo oficial).

### 2. Importar el proyecto
- Ya dentro de Vercel, tocá **"Add New…"** (arriba a la derecha) → **"Project"**.
- En la lista de repositorios buscá **`Clientany`** y tocá **"Import"**.
  - Si no aparece, tocá **"Adjust GitHub App Permissions"** y dale acceso al repo `farugroup/Clientany`.

### 3. Elegir la rama correcta ⚠️ (importante)
- En la pantalla de configuración, buscá dónde dice **Branch** (rama) — a veces está en
  **"Git Branch"** o en el desplegable junto al nombre del proyecto.
- Seleccioná la rama **`claude/crm-multicanal-ecommerce-o236ay`**.
  - *(Si no te deja elegirla acá, no pasa nada: hacé el deploy igual y después la cambiás en
    Settings → Git → Production Branch, y tocás "Redeploy".)*

### 4. Configuración
- **Framework Preset**: debería decir **Next.js** solo (no lo cambies).
- **Build Command**, **Output**, **Install Command**: dejalos como están (ya vienen bien).
- **Environment Variables**: **no hace falta ninguna** para esta demo. Dejalo vacío.

### 5. Deploy
- Tocá el botón **"Deploy"**.
- Esperá 1–2 minutos mientras Vercel construye la app.
- Cuando termine, vas a ver tu sitio. Copiá el link (ej: `https://clientany-xxxx.vercel.app`).

---

## ✅ Probá que funcione

Abrí tu link y probá:

- El **Panel** con los números y gráficos.
- **Bandeja unificada** (`/inbox`) — cambiá de marca arriba a la izquierda.
- **Seguí tu envío** (`/tracking`) — buscá `LUN-10428` o `flor.benitez@gmail.com`.
- La página **pública** de seguimiento para tus clientes: agregá `/track` al final de tu link.
- Abrilo también desde el **celular**: está pensado para verse bien en mobile.

---

## 🔄 Cada vez que haya cambios

Vercel se **actualiza solo**: cada vez que se sube un cambio a la rama, vuelve a publicar la web
automáticamente. No tenés que hacer nada.

---

## ❓ Problemas comunes

| Problema | Solución |
|---|---|
| No aparece el repo `Clientany` al importar | Tocá **"Adjust GitHub App Permissions"** y dale acceso al repo. |
| Deployó pero se ve una versión vieja / vacía | Andá a **Settings → Git**, poné como *Production Branch* la rama `claude/crm-multicanal-ecommerce-o236ay` y tocá **Redeploy**. |
| Error en el build | Revisá que el **Framework Preset** sea **Next.js**. No agregues variables de entorno. |

---

¿Se te complica algún paso? Avisame en cuál te trabaste y te ayudo puntual.
