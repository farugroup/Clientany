"use client";

import { useState, type FormEvent } from "react";
import { CircleAlert, CircleCheck, LoaderCircle, Send } from "lucide-react";

type Estado = { tipo: "nada" } | { tipo: "enviando" } | { tipo: "ok" } | { tipo: "error"; texto: string };

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Formulario «Quiero que me contacten» → POST /api/lead.
export default function FormularioContacto() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [canales, setCanales] = useState("");
  const [trampa, setTrampa] = useState(""); // campo oculto: si lo completa, es un robot
  const [estado, setEstado] = useState<Estado>({ tipo: "nada" });

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!EMAIL_OK.test(email.trim())) {
      setEstado({ tipo: "error", texto: "Revisá el email: no parece válido." });
      return;
    }
    setEstado({ tipo: "enviando" });
    try {
      const r = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, email, whatsapp, canales, sitio_web: trampa }),
      });
      const j: { ok?: boolean; error?: string } = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.error || "");
      setEstado({ tipo: "ok" });
      setNombre("");
      setEmail("");
      setWhatsapp("");
      setCanales("");
    } catch (err) {
      const motivo = err instanceof Error && err.message ? err.message : "";
      setEstado({
        tipo: "error",
        texto: motivo || "No pudimos mandar el formulario. Probá de nuevo en un rato o escribinos a hola@clientany.com.",
      });
    }
  }

  const enviando = estado.tipo === "enviando";

  return (
    <form onSubmit={enviar} noValidate className="mx-auto w-full max-w-2xl text-left">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-300">Tu nombre</span>
          <input
            className="input"
            name="nombre"
            autoComplete="name"
            placeholder="Cómo te llamás"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            maxLength={120}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-300">Email</span>
          <input
            className="input"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="vos@tuempresa.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={200}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-300">WhatsApp</span>
          <input
            className="input"
            name="whatsapp"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+54 9 11 5555-1234"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            maxLength={40}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-300">¿Cuántos canales atendés?</span>
          <select className="input" name="canales" value={canales} onChange={(e) => setCanales(e.target.value)}>
            <option value="">Elegí una opción</option>
            <option value="1">1 canal</option>
            <option value="2-3">2 o 3 canales</option>
            <option value="4-10">De 4 a 10 canales</option>
            <option value="10+">Más de 10</option>
          </select>
        </label>
        {/* Campo trampa para robots: una persona no lo ve ni lo completa */}
        <input
          type="text"
          name="sitio_web"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="hidden"
          value={trampa}
          onChange={(e) => setTrampa(e.target.value)}
        />
      </div>

      <button type="submit" disabled={enviando} className="btn-primary mt-4 w-full py-3 text-[15px]">
        {enviando ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {enviando ? "Enviando…" : "Quiero que me contacten"}
      </button>

      <div className="mt-3 min-h-[1.5rem] text-center text-sm" role="status" aria-live="polite">
        {estado.tipo === "ok" && (
          <span className="inline-flex items-center gap-1.5 font-semibold text-green-300">
            <CircleCheck className="h-4 w-4" /> ¡Listo! Te escribimos en menos de 24 h.
          </span>
        )}
        {estado.tipo === "error" && (
          <span className="inline-flex items-start gap-1.5 font-medium text-red-300">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {estado.texto}
          </span>
        )}
      </div>
    </form>
  );
}
