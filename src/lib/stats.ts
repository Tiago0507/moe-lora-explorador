/**
 * Semiamplitud del intervalo binomial aproximado (Wald) para una proporción:
 *   z · √(p(1 − p) / n)
 * Es una aproximación analítica, no una varianza medida entre semillas.
 */
export function binomialHalfWidth(p: number, n: number, z = 1.96): number {
  if (n <= 0) throw new RangeError('n debe ser positivo.');
  if (p < 0 || p > 1) throw new RangeError('p debe estar en [0, 1].');
  return z * Math.sqrt((p * (1 - p)) / n);
}

/** Diferencia en puntos porcentuales entre dos proporciones. */
export function diffPp(a: number, b: number): number {
  return (a - b) * 100;
}
