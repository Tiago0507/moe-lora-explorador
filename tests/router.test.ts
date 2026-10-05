import { describe, expect, it } from 'vitest';
import { ROUTER_RAW, ROUTER_RAW_ENTROPY_REPORTED, TASK_IDS } from '../src/data/experiment';
import { effectiveWeights, normalizedEntropy, rankedExperts } from '../src/lib/router';

describe('pesos del enrutador', () => {
  it('con τ = 1 y k = E devuelve las probabilidades crudas', () => {
    const p = ROUTER_RAW.sentiment;
    const w = effectiveWeights(p, 1, 4);
    const sum = p.reduce((a, b) => a + b, 0);
    w.forEach((x, i) => {
      expect(x).toBeCloseTo((p[i] ?? 0) / sum, 10);
    });
  });

  it('reproduce los pesos efectivos del paper (τ = 0.5, top-2)', () => {
    const expected = {
      sentiment: [0.402, 0, 0.598, 0],
      rating5: [0, 0, 0.967, 0.033],
      amazon_sent: [0.103, 0, 0.897, 0],
      topic: [0, 0.582, 0, 0.418],
      length: [0.811, 0.189, 0, 0],
    } as const;
    for (const task of TASK_IDS) {
      const w = effectiveWeights(ROUTER_RAW[task], 0.5, 2);
      w.forEach((x, i) => {
        expect(x).toBeCloseTo(expected[task][i] ?? 0, 3);
      });
    }
  });

  it('la entropía de los pesos crudos se acerca a la reportada por el notebook', () => {
    for (const task of TASK_IDS) {
      // Los valores del mapa están redondeados a 2 decimales: tolerancia de 0.01.
      expect(
        Math.abs(normalizedEntropy(ROUTER_RAW[task]) - ROUTER_RAW_ENTROPY_REPORTED[task]),
      ).toBeLessThan(0.01);
    }
  });

  it('la entropía efectiva media es ≈ 0.33', () => {
    const mean =
      TASK_IDS.map((t) => normalizedEntropy(effectiveWeights(ROUTER_RAW[t], 0.5, 2))).reduce(
        (a, b) => a + b,
        0,
      ) / TASK_IDS.length;
    expect(mean).toBeCloseTo(0.334, 2);
  });

  it('ordena los expertos y descarta los de peso cero', () => {
    expect(rankedExperts([0.1, 0, 0.9, 0])).toEqual([2, 0]);
  });

  it('rechaza una temperatura no positiva', () => {
    expect(() => effectiveWeights([0.5, 0.5], 0, 1)).toThrow(RangeError);
  });
});
