/**
 * Formato numérico del paper: punto decimal y espacio fino como separador de miles
 * (36 864), para que la página y el PDF muestren exactamente las mismas cifras.
 */
const THIN_SPACE = ' ';

export function formatInt(n: number): string {
  const sign = n < 0 ? '−' : '';
  const digits = Math.round(Math.abs(n)).toString();
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, THIN_SPACE);
}

export function formatDecimal(n: number, decimals: number): string {
  const s = Math.abs(n).toFixed(decimals);
  return (n < 0 && Number(s) !== 0 ? '−' : '') + s;
}

/** Con signo explícito: +3.60 / −0.25. */
export function formatSigned(n: number, decimals: number): string {
  const s = formatDecimal(Math.abs(n), decimals);
  if (Number(s) === 0) return s;
  return (n > 0 ? '+' : '−') + s;
}

/** Notación compacta para ejes: 150 k, 1.2 M. */
export function formatCompact(n: number): string {
  if (Math.abs(n) >= 1e6) return `${formatDecimal(n / 1e6, n % 1e6 === 0 ? 0 : 1)}${THIN_SPACE}M`;
  if (Math.abs(n) >= 1e3) return `${formatDecimal(n / 1e3, n % 1e3 === 0 ? 0 : 1)}${THIN_SPACE}k`;
  return formatInt(n);
}
