/** Escala lineal y marcas "redondas" para los ejes de las gráficas SVG. */
export type Scale = (value: number) => number;

export function linearScale(
  domain: readonly [number, number],
  range: readonly [number, number],
): Scale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0 || 1;
  return (v) => r0 + ((v - d0) / span) * (r1 - r0);
}

/** Paso "bonito" (1, 2, 2.5 o 5 × 10^n) que deja como mucho `maxTicks` marcas. */
export function niceStep(max: number, maxTicks = 5): number {
  if (max <= 0) return 1;
  const raw = max / maxTicks;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw);
  return step ?? 10 * pow;
}

/** Marcas desde 0 hasta el primer múltiplo del paso que cubre `max`. */
export function niceTicks(max: number, maxTicks = 5): number[] {
  const step = niceStep(max, maxTicks);
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(Number(v.toPrecision(12)));
  return ticks;
}
