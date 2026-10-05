import { describe, expect, it } from 'vitest';
import { AVERAGES, CONFIGS, METRICS, TASK_IDS } from '../src/data/experiment';
import { formatCompact, formatInt, formatSigned } from '../src/lib/format';
import { niceTicks } from '../src/lib/scale';
import { binomialHalfWidth, diffPp } from '../src/lib/stats';

describe('estadística', () => {
  it('semiamplitud aproximada de ±1.9 a ±4.9 pp con n = 400', () => {
    expect(binomialHalfWidth(0.96, 400) * 100).toBeCloseTo(1.92, 1);
    expect(binomialHalfWidth(0.53, 400) * 100).toBeCloseTo(4.89, 1);
  });

  it('la brecha en rating5 es +3.60 y +3.86 pp', () => {
    expect(diffPp(METRICS.perTask.rating5.macroF1, METRICS.shared.rating5.macroF1)).toBeCloseTo(
      3.6,
      2,
    );
    expect(diffPp(METRICS.moe.rating5.macroF1, METRICS.shared.rating5.macroF1)).toBeCloseTo(
      3.86,
      2,
    );
  });

  it('los promedios coinciden con las métricas por tarea', () => {
    for (const { id } of CONFIGS) {
      const meanF1 = TASK_IDS.reduce((a, t) => a + METRICS[id][t].macroF1, 0) / TASK_IDS.length;
      expect(meanF1).toBeCloseTo(AVERAGES[id].macroF1, 3);
    }
  });
});

describe('formato', () => {
  it('usa espacio fino como separador de miles y signo menos tipográfico', () => {
    expect(formatInt(147_476)).toBe('147 476');
    expect(formatSigned(-0.25, 2)).toBe('−0.25');
    expect(formatSigned(3.6, 2)).toBe('+3.60');
    expect(formatCompact(150_000)).toBe('150 k');
  });
});

describe('escala', () => {
  it('genera marcas redondas que cubren el máximo', () => {
    expect(niceTicks(294_912, 5)).toEqual([0, 100_000, 200_000, 300_000]);
    expect(niceTicks(1, 5)).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1]);
  });
});
