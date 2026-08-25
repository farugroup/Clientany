export function money(amount: number, currency = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function compactMoney(amount: number, currency = "ARS") {
  const symbol = currency === "ARS" ? "$" : currency + " ";
  if (amount >= 1_000_000) return `${symbol}${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${symbol}${(amount / 1_000).toFixed(0)}k`;
  return `${symbol}${amount}`;
}

export function num(n: number) {
  return new Intl.NumberFormat("es-AR").format(n);
}

export function timeAgo(iso: string, now = new Date("2026-08-25T14:30:00-03:00")) {
  const diff = now.getTime() - new Date(iso).getTime();
  const abs = Math.abs(diff);
  const future = diff < 0;
  const min = Math.round(abs / 60000);
  if (min < 1) return "recién";
  if (min < 60) return future ? `en ${min} min` : `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return future ? `en ${h} h` : `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d < 30) return future ? `en ${d} d` : `hace ${d} d`;
  const mo = Math.round(d / 30);
  return future ? `en ${mo} mes` : `hace ${mo} mes`;
}

export function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
  });
}

export function dateTime(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function pct(part: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}
