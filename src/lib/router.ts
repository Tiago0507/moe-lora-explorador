/**
 * Pesos del enrutador condicionado a la tarea (ec. 2 del paper):
 *   ω_t = softmax(TopK(g_t / τ, k))
 * El notebook solo muestra p = softmax(g_t). Como softmax es invariante a
 * desplazamientos, log p = g_t + c, y por tanto los pesos efectivos se pueden
 * reconstruir desde p: dentro del top-k, ω_i ∝ p_i^(1/τ).
 */

/** Pesos efectivos a partir de las probabilidades crudas `p`, temperatura y top-k. */
export function effectiveWeights(
  p: readonly number[],
  temperature: number,
  topK: number,
): number[] {
  if (p.length === 0) return [];
  if (temperature <= 0) throw new RangeError('La temperatura debe ser positiva.');
  const k = Math.max(1, Math.min(Math.floor(topK), p.length));
  const logits = p.map((x) => Math.log(Math.max(x, 1e-12)) / temperature);
  // Orden estable: ante empates gana el experto de menor índice.
  const keep = new Set(
    logits
      .map((value, index) => ({ value, index }))
      .sort((a, b) => b.value - a.value || a.index - b.index)
      .slice(0, k)
      .map((e) => e.index),
  );
  const max = Math.max(...logits.filter((_, i) => keep.has(i)));
  const exps = logits.map((l, i) => (keep.has(i) ? Math.exp(l - max) : 0));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

/** Entropía normalizada en [0, 1]: 0 = un solo experto, 1 = mezcla uniforme. */
export function normalizedEntropy(w: readonly number[]): number {
  if (w.length <= 1) return 0;
  const h = w.reduce((acc, x) => (x > 0 ? acc - x * Math.log(x) : acc), 0);
  return h / Math.log(w.length);
}

/** Índices de los expertos ordenados por peso descendente (solo los de peso > 0). */
export function rankedExperts(w: readonly number[]): number[] {
  return w
    .map((value, index) => ({ value, index }))
    .filter((e) => e.value > 0)
    .sort((a, b) => b.value - a.value || a.index - b.index)
    .map((e) => e.index);
}
