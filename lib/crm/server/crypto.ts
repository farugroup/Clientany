// ============================================================
// Clientany · CRM — cifrado de credenciales (SOLO servidor).
// AES-256-GCM con una clave derivada de CLIENTANY_SECRET. Los tokens de
// Meta y la clave de IA de cada empresa se guardan así en la base y nunca
// vuelven al navegador.
// ============================================================
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const PREFIJO = "enc:v1:";

function modoMemoria(): boolean {
  return (
    process.env.CLIENTANY_DB === "memory" ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL
  );
}

// La clave se resuelve recién al usarla (no al importar el módulo), así el
// build no se cae si la variable todavía no está cargada.
function clave(): Buffer {
  const secreto = process.env.CLIENTANY_SECRET;
  if (secreto) return createHash("sha256").update(secreto).digest();
  if (modoMemoria()) return createHash("sha256").update("clientany-dev-sin-secreto").digest();
  throw new Error("Falta CLIENTANY_SECRET en las variables de entorno");
}

export function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", clave(), iv);
  const data = Buffer.concat([cipher.update(texto, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIJO}${iv.toString("base64")}:${tag.toString("base64")}:${data.toString("base64")}`;
}

// Si el texto no está cifrado (no empieza con enc:v1:) lo devuelve tal cual.
export function descifrar(s: string): string {
  if (!s || !s.startsWith(PREFIJO)) return s;
  const partes = s.slice(PREFIJO.length).split(":");
  if (partes.length !== 3) throw new Error("Credencial cifrada con un formato que no reconozco");
  const [ivB, tagB, dataB] = partes;
  const decipher = createDecipheriv("aes-256-gcm", clave(), Buffer.from(ivB, "base64"));
  decipher.setAuthTag(Buffer.from(tagB, "base64"));
  const texto = Buffer.concat([decipher.update(Buffer.from(dataB, "base64")), decipher.final()]);
  return texto.toString("utf8");
}

export function hashSha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

// Token aleatorio de `n` caracteres (letras y números), apto para URLs.
export function tokenSeguro(n = 32): string {
  const abc = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = randomBytes(n);
  let s = "";
  for (let i = 0; i < n; i++) s += abc[bytes[i] % abc.length];
  return s;
}
