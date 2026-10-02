"use client";
// ============================================================
// Clientany · Bandeja — «Posponer…»: calendario nativo + hora opcional +
// atajos (Mañana · En 3 días · El lunes · En una semana · Principio de
// mes) + nota. Devuelve un ISO en la zona de la empresa.
// ============================================================
import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { Campo, Modal } from "@/components/crm/ui";
import { partesEnZona } from "@/lib/crm/core";
import { diaRelativo, isoEnZona, sumarDias, ymdEnZona, ZONA_DEFAULT } from "./comun";

export function Posponer({
  abierto,
  onCerrar,
  onGuardar,
  zona,
  cuantos = 1,
  inicial,
}: {
  abierto: boolean;
  onCerrar: () => void;
  onGuardar: (fechaIso: string, nota: string) => Promise<void> | void;
  zona: string;
  cuantos?: number; // cuántos chats se posponen (selección múltiple)
  inicial?: { fecha?: string; nota?: string } | null;
}) {
  const z = zona || ZONA_DEFAULT;
  const hoy = ymdEnZona(new Date(), z);
  const [ymd, setYmd] = useState(sumarDias(hoy, 1));
  const [hora, setHora] = useState("");
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    if (inicial?.fecha) {
      const p = partesEnZona(new Date(inicial.fecha), z);
      setYmd(p.ymd);
      setHora(p.hora || p.minuto ? `${String(p.hora).padStart(2, "0")}:${String(p.minuto).padStart(2, "0")}` : "");
    } else {
      setYmd(sumarDias(hoy, 1));
      setHora("");
    }
    setNota(inicial?.nota || "");
  }, [abierto, inicial, hoy, z]);

  function proximoLunes(): string {
    const dia = partesEnZona(new Date(), z).dia; // 0 = domingo
    const faltan = ((8 - dia) % 7) || 7;
    return sumarDias(hoy, faltan);
  }
  function principioDeMes(): string {
    const [y, m] = hoy.split("-").map(Number);
    return new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
  }

  const atajos: { nombre: string; ymd: string }[] = [
    { nombre: "Mañana", ymd: sumarDias(hoy, 1) },
    { nombre: "En 3 días", ymd: sumarDias(hoy, 3) },
    { nombre: "El lunes", ymd: proximoLunes() },
    { nombre: "En una semana", ymd: sumarDias(hoy, 7) },
    { nombre: "Principio de mes", ymd: principioDeMes() },
  ];

  const iso = ymd ? isoEnZona(ymd, hora || "00:00", z) : "";
  const vencido = iso ? new Date(iso).getTime() <= Date.now() : false;

  async function guardar() {
    if (!ymd || vencido) return;
    setGuardando(true);
    try {
      await onGuardar(iso, nota.trim());
      onCerrar();
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={
        <span className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-brand-300" /> Posponer{cuantos > 1 ? ` ${cuantos} chats` : ""}
        </span>
      }
      ancho="sm"
      pie={
        <>
          <button className="btn-ghost" onClick={onCerrar} disabled={guardando}>Cancelar</button>
          <button className="btn-primary" onClick={guardar} disabled={guardando || !ymd || vencido}>
            {iso ? `Volver ${diaRelativo(iso, z)}` : "Guardar"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {atajos.map((a) => (
            <button
              key={a.nombre}
              type="button"
              onClick={() => setYmd(a.ymd)}
              className={`chip border ${ymd === a.ymd ? "border-brand-500/40 bg-brand-500/15 text-brand-200" : "border-ink-700 bg-ink-850 text-ink-300 hover:text-white"}`}
            >
              {a.nombre}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Día">
            <input type="date" className="input" value={ymd} min={hoy} onChange={(e) => setYmd(e.target.value)} />
          </Campo>
          <Campo etiqueta="Hora" ayuda="opcional">
            <input type="time" className="input" value={hora} onChange={(e) => setHora(e.target.value)} />
          </Campo>
        </div>
        {vencido && <div className="text-xs text-red-400">Ese momento ya pasó: elegí otro.</div>}
        <Campo etiqueta="Nota" ayuda="qué hay que hacer cuando vuelva">
          <input className="input" value={nota} maxLength={200} placeholder="Ej.: preguntarle si le llegó el presupuesto" onChange={(e) => setNota(e.target.value)} />
        </Campo>
        <p className="text-xs text-ink-500">
          El chat pasa a «Más adelante» y vuelve solo a Ventas {iso ? diaRelativo(iso, z) : "ese día"}
          {hora ? "" : " a primera hora"}.
        </p>
      </div>
    </Modal>
  );
}
