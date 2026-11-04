const bogotaDateTime = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  dateStyle: 'medium',
  timeStyle: 'short',
});

const bogotaDate = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  dateStyle: 'medium',
});

/** ISO UTC → texto en hora de Bogotá. */
export function formatBogotaDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return bogotaDateTime.format(new Date(iso));
}

export function formatBogotaDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return bogotaDate.format(new Date(iso));
}

/** Fecha calendario `YYYY-MM-DD` sin pasar por Date (evita correr el día). */
export function formatCalendarDate(ymd: string | null | undefined): string {
  if (!ymd) return '—';
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return ymd;
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

export function relativeFromNow(iso: string | null | undefined): string {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.round(ms / 60_000);
  if (mins < 1) return 'hace un momento';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return `hace ${days} d`;
}

export function remainingLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diff);
  const hours = Math.floor(abs / 3_600_000);
  const days = Math.floor(hours / 24);
  const remH = hours % 24;
  if (diff >= 0) {
    if (days > 0) return `faltan ${days} d ${remH} h`;
    return `faltan ${hours} h`;
  }
  if (days > 0) return `venció hace ${days} d ${remH} h`;
  return `venció hace ${hours} h`;
}

/** 23 dígitos → `#####-##-##-###-####-#####-##` (también acepta 21). */
export function formatRadicado(digits: string | null | undefined): string {
  if (!digits) return '';
  const d = digits.replace(/\D/g, '');
  if (d.length === 23) {
    return `${d.slice(0, 5)}-${d.slice(5, 7)}-${d.slice(7, 9)}-${d.slice(9, 12)}-${d.slice(12, 16)}-${d.slice(16, 21)}-${d.slice(21)}`;
  }
  if (d.length === 21) {
    return `${d.slice(0, 5)}-${d.slice(5, 7)}-${d.slice(7, 9)}-${d.slice(9, 12)}-${d.slice(12, 16)}-${d.slice(16)}`;
  }
  return digits;
}

export function normalizeRadicadoInput(value: string): string {
  return value.replace(/\D/g, '');
}

export function formatBytes(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
