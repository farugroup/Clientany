// ============================================================
// Clientany · CRM — importar CSV (pedidos, stock, contactos).
// Tolerante: coma o punto y coma, comillas, encabezados en español o
// inglés, en cualquier orden. Devuelve filas + los errores por línea.
// ============================================================
import type { Contacto, Pedido, PedidoEstado, Producto } from "./types";
import { ahoraIso, emailValido, normalizarTelefono, normalizarTexto, sinAcentos, uid } from "./core";

export interface ImportacionResultado<T> {
  filas: T[];
  errores: { linea: number; motivo: string }[];
  separador: string;
  encabezados: string[];
}

function detectarSeparador(primera: string): string {
  const c = (primera.match(/,/g) || []).length;
  const pc = (primera.match(/;/g) || []).length;
  const t = (primera.match(/\t/g) || []).length;
  if (t > c && t > pc) return "\t";
  return pc > c ? ";" : ",";
}

export function parsearCsv(texto: string): { encabezados: string[]; filas: string[][]; separador: string } {
  const limpio = (texto || "").replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const lineas: string[][] = [];
  const sep = detectarSeparador(limpio.split("\n")[0] || "");
  let fila: string[] = [];
  let campo = "";
  let enComillas = false;
  for (let i = 0; i < limpio.length; i++) {
    const ch = limpio[i];
    if (enComillas) {
      if (ch === '"') {
        if (limpio[i + 1] === '"') { campo += '"'; i++; }
        else enComillas = false;
      } else campo += ch;
    } else if (ch === '"') enComillas = true;
    else if (ch === sep) { fila.push(campo); campo = ""; }
    else if (ch === "\n") { fila.push(campo); lineas.push(fila); fila = []; campo = ""; }
    else campo += ch;
  }
  if (campo.length || fila.length) { fila.push(campo); lineas.push(fila); }
  const noVacias = lineas.filter((f) => f.some((c) => c.trim() !== ""));
  const encabezados = (noVacias[0] || []).map((h) => normalizarTexto(h).replace(/\s+/g, "_"));
  return { encabezados, filas: noVacias.slice(1).map((f) => f.map((c) => c.trim())), separador: sep };
}

// Encuentra la columna por cualquiera de los nombres posibles.
function col(encabezados: string[], ...nombres: string[]): number {
  for (const n of nombres) {
    const i = encabezados.indexOf(n);
    if (i >= 0) return i;
  }
  for (const n of nombres) {
    const i = encabezados.findIndex((h) => h.includes(n));
    if (i >= 0) return i;
  }
  return -1;
}

function numero(s: string | undefined): number {
  if (!s) return 0;
  let t = s.replace(/[^\d,.-]/g, "");
  // "1.234,56" → 1234.56 ; "1234.56" → 1234.56 ; "1,234" → 1234
  if (t.includes(",") && t.includes(".")) t = t.replace(/\./g, "").replace(",", ".");
  else if (t.includes(",")) t = /,\d{1,2}$/.test(t) ? t.replace(",", ".") : t.replace(/,/g, "");
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
}

function fechaIso(s: string | undefined): string {
  if (!s) return ahoraIso();
  const t = s.trim();
  // dd/mm/yyyy
  const m = t.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (m) {
    const y = m[3].length === 2 ? Number("20" + m[3]) : Number(m[3]);
    const d = new Date(y, Number(m[2]) - 1, Number(m[1]), Number(m[4] || 12), Number(m[5] || 0));
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  const d = new Date(t);
  return isNaN(d.getTime()) ? ahoraIso() : d.toISOString();
}

const ESTADOS: Record<string, PedidoEstado> = {
  pendiente: "pendiente", pending: "pendiente", "pendiente de pago": "pendiente", unpaid: "pendiente",
  pagado: "pagado", paid: "pagado", cobrado: "pagado", confirmado: "pagado",
  preparacion: "preparacion", "en preparacion": "preparacion", packed: "preparacion", empaquetado: "preparacion",
  enviado: "enviado", shipped: "enviado", despachado: "enviado", "en camino": "enviado", "en viaje": "enviado",
  entregado: "entregado", delivered: "entregado",
  cancelado: "cancelado", cancelled: "cancelado", canceled: "cancelado", anulado: "cancelado",
  devuelto: "devuelto", returned: "devuelto",
};

export function estadoDesdeTexto(s: string | undefined): PedidoEstado {
  const t = sinAcentos(s || "");
  return ESTADOS[t] || (Object.entries(ESTADOS).find(([k]) => t.includes(k))?.[1] ?? "pagado");
}

export function importarPedidos(texto: string, empresa_id: string, moneda = "ARS"): ImportacionResultado<Pedido> {
  const { encabezados, filas, separador } = parsearCsv(texto);
  const iNum = col(encabezados, "numero", "nro", "orden", "order", "pedido", "id");
  const iNombre = col(encabezados, "nombre", "cliente", "name", "customer", "comprador");
  const iTel = col(encabezados, "telefono", "celular", "whatsapp", "phone", "tel");
  const iMail = col(encabezados, "email", "mail", "correo");
  const iEstado = col(encabezados, "estado", "status");
  const iTotal = col(encabezados, "total", "monto", "importe", "amount");
  const iFecha = col(encabezados, "fecha", "date", "creado", "created");
  const iTransp = col(encabezados, "transporte", "correo_envio", "carrier", "courier", "envio");
  const iSeg = col(encabezados, "seguimiento", "tracking", "guia", "codigo_de_seguimiento");
  const iUrl = col(encabezados, "url", "link");
  const iItems = col(encabezados, "productos", "items", "detalle", "articulos", "producto");
  const iDir = col(encabezados, "direccion", "address", "domicilio");
  const iLoc = col(encabezados, "localidad", "ciudad", "city");
  const iProv = col(encabezados, "provincia", "state");
  const iCp = col(encabezados, "cp", "codigo_postal", "zip");
  const iNotas = col(encabezados, "notas", "nota", "observaciones", "comentario");
  const iCanal = col(encabezados, "canal", "origen", "channel", "source");
  const errores: { linea: number; motivo: string }[] = [];
  const out: Pedido[] = [];
  if (iNum < 0 && iNombre < 0) {
    errores.push({ linea: 1, motivo: "No encuentro la columna «numero» ni «nombre» en el encabezado." });
    return { filas: out, errores, separador, encabezados };
  }
  filas.forEach((f, idx) => {
    const linea = idx + 2;
    const num = iNum >= 0 ? f[iNum] : "";
    const nombre = iNombre >= 0 ? f[iNombre] : "";
    if (!num && !nombre) { errores.push({ linea, motivo: "Fila sin número ni nombre." }); return; }
    const items = iItems >= 0 && f[iItems]
      ? f[iItems].split(/[|;]|,(?=\s*[A-Za-z])/).map((s) => s.trim()).filter(Boolean).map((s) => {
          const m = s.match(/^(\d+)\s*[x×]\s*(.+)$/i) || s.match(/^(.+?)\s*[x×]\s*(\d+)$/i);
          if (m) {
            const cant = Number(m[1]) ? Number(m[1]) : Number(m[2]);
            const nom = Number(m[1]) ? m[2] : m[1];
            return { nombre: nom.trim(), cantidad: cant || 1, precio: 0 };
          }
          return { nombre: s, cantidad: 1, precio: 0 };
        })
      : [];
    const ahora = ahoraIso();
    out.push({
      id: uid("pd"),
      empresa_id,
      numero: num || `CSV-${linea}`,
      contacto_id: null,
      nombre: nombre || "Sin nombre",
      telefono: iTel >= 0 ? normalizarTelefono(f[iTel]) || undefined : undefined,
      email: iMail >= 0 && emailValido(f[iMail]) ? f[iMail].trim().toLowerCase() : undefined,
      estado: estadoDesdeTexto(iEstado >= 0 ? f[iEstado] : ""),
      items,
      total: iTotal >= 0 ? numero(f[iTotal]) : items.reduce((s, i) => s + i.precio * i.cantidad, 0),
      moneda,
      envio: {
        transporte: iTransp >= 0 ? f[iTransp] || undefined : undefined,
        seguimiento: iSeg >= 0 ? f[iSeg] || undefined : undefined,
        url: iUrl >= 0 ? f[iUrl] || undefined : undefined,
        direccion: iDir >= 0 ? f[iDir] || undefined : undefined,
        localidad: iLoc >= 0 ? f[iLoc] || undefined : undefined,
        provincia: iProv >= 0 ? f[iProv] || undefined : undefined,
        cp: iCp >= 0 ? f[iCp] || undefined : undefined,
      },
      canal: iCanal >= 0 && f[iCanal] ? f[iCanal] : "csv",
      notas: iNotas >= 0 ? f[iNotas] || undefined : undefined,
      creado: fechaIso(iFecha >= 0 ? f[iFecha] : undefined),
      actualizado: ahora,
    });
  });
  return { filas: out, errores, separador, encabezados };
}

export function importarProductos(texto: string, empresa_id: string, moneda = "ARS"): ImportacionResultado<Producto> {
  const { encabezados, filas, separador } = parsearCsv(texto);
  const iSku = col(encabezados, "sku", "codigo", "code", "id");
  const iNombre = col(encabezados, "nombre", "producto", "name", "title", "titulo");
  const iPrecio = col(encabezados, "precio", "price", "importe");
  const iStock = col(encabezados, "stock", "cantidad", "qty", "quantity", "existencia");
  const iMin = col(encabezados, "minimo", "stock_minimo", "min");
  const iCat = col(encabezados, "categoria", "category", "rubro");
  const iDesc = col(encabezados, "descripcion", "description", "detalle");
  const iImg = col(encabezados, "imagen", "image", "foto", "url_imagen");
  const iAct = col(encabezados, "activo", "active", "publicado", "visible");
  const errores: { linea: number; motivo: string }[] = [];
  const out: Producto[] = [];
  if (iNombre < 0) {
    errores.push({ linea: 1, motivo: "No encuentro la columna «nombre» en el encabezado." });
    return { filas: out, errores, separador, encabezados };
  }
  filas.forEach((f, idx) => {
    const linea = idx + 2;
    const nombre = f[iNombre];
    if (!nombre) { errores.push({ linea, motivo: "Fila sin nombre." }); return; }
    const sku = (iSku >= 0 && f[iSku]) || normalizarTexto(nombre).replace(/\s+/g, "-").slice(0, 40).toUpperCase();
    const act = iAct >= 0 ? f[iAct] : "";
    out.push({
      id: uid("pr"),
      empresa_id,
      sku,
      nombre,
      precio: iPrecio >= 0 ? numero(f[iPrecio]) : 0,
      moneda,
      stock: iStock >= 0 ? Math.round(numero(f[iStock])) : 0,
      stock_minimo: iMin >= 0 ? Math.round(numero(f[iMin])) : undefined,
      categoria: iCat >= 0 ? f[iCat] || undefined : undefined,
      descripcion: iDesc >= 0 ? f[iDesc] || undefined : undefined,
      imagen_url: iImg >= 0 ? f[iImg] || undefined : undefined,
      activo: act ? !/^(no|false|0|inactivo|oculto)$/i.test(act) : true,
      actualizado: ahoraIso(),
    });
  });
  return { filas: out, errores, separador, encabezados };
}

export function importarContactos(texto: string, empresa_id: string): ImportacionResultado<Contacto> {
  const { encabezados, filas, separador } = parsearCsv(texto);
  const iNombre = col(encabezados, "nombre", "name", "cliente", "contacto");
  const iTel = col(encabezados, "telefono", "celular", "whatsapp", "phone", "tel");
  const iMail = col(encabezados, "email", "mail", "correo");
  const iDoc = col(encabezados, "documento", "dni", "cuit");
  const iIg = col(encabezados, "instagram", "ig", "usuario_ig");
  const iDir = col(encabezados, "direccion", "address", "domicilio");
  const iLoc = col(encabezados, "localidad", "ciudad", "city");
  const iProv = col(encabezados, "provincia", "state");
  const iCp = col(encabezados, "cp", "codigo_postal", "zip");
  const iNotas = col(encabezados, "notas", "nota", "observaciones");
  const errores: { linea: number; motivo: string }[] = [];
  const out: Contacto[] = [];
  if (iNombre < 0 && iTel < 0 && iMail < 0) {
    errores.push({ linea: 1, motivo: "Necesito al menos una columna «nombre», «telefono» o «email»." });
    return { filas: out, errores, separador, encabezados };
  }
  filas.forEach((f, idx) => {
    const linea = idx + 2;
    const nombre = iNombre >= 0 ? f[iNombre] : "";
    const tel = iTel >= 0 ? normalizarTelefono(f[iTel]) : "";
    const mail = iMail >= 0 && emailValido(f[iMail]) ? f[iMail].trim().toLowerCase() : "";
    if (!nombre && !tel && !mail) { errores.push({ linea, motivo: "Fila vacía." }); return; }
    const ahora = ahoraIso();
    out.push({
      id: uid("ct"),
      empresa_id,
      nombre: nombre || mail || tel,
      telefono: tel || undefined,
      email: mail || undefined,
      documento: iDoc >= 0 ? f[iDoc] || undefined : undefined,
      ig_usuario: iIg >= 0 ? (f[iIg] || "").replace(/^@/, "") || undefined : undefined,
      direccion: iDir >= 0 ? f[iDir] || undefined : undefined,
      localidad: iLoc >= 0 ? f[iLoc] || undefined : undefined,
      provincia: iProv >= 0 ? f[iProv] || undefined : undefined,
      cp: iCp >= 0 ? f[iCp] || undefined : undefined,
      notas: iNotas >= 0 ? f[iNotas] || undefined : undefined,
      etiquetas: [],
      origen: "csv",
      creado: ahora,
      actualizado: ahora,
    });
  });
  return { filas: out, errores, separador, encabezados };
}

// Para exportar: arma un CSV con comillas donde haga falta.
export function aCsv(encabezados: string[], filas: (string | number | undefined | null)[][]): string {
  const esc = (v: string | number | undefined | null) => {
    const s = v === undefined || v === null ? "" : String(v);
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [encabezados.map(esc).join(","), ...filas.map((f) => f.map(esc).join(","))].join("\n");
}
