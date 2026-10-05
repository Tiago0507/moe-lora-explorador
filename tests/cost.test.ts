import { describe, expect, it } from 'vitest';
import { COSTS } from '../src/data/experiment';
import {
  adapterParams,
  crossoverTasks,
  gateParams,
  loraParams,
  splitRankIsValid,
} from '../src/lib/cost';

const experiment = { tasks: 5, experts: 4, rank: 2, splitRank: false };

describe('modelo de costo', () => {
  it('reproduce L = 36 864 para r = 2 en DistilBERT', () => {
    expect(loraParams(2)).toBe(36_864);
  });

  it('coincide con los parámetros medidos en el notebook (celda 16)', () => {
    expect(adapterParams('shared', experiment)).toBe(COSTS.shared.adapterRouterParams);
    expect(adapterParams('perTask', experiment)).toBe(COSTS.perTask.adapterRouterParams);
    expect(adapterParams('moe', experiment)).toBe(COSTS.moe.adapterRouterParams);
  });

  it('reproduce la tabla de extrapolación (celda 32)', () => {
    const rows = [3, 4, 5, 6, 8].map((tasks) => [
      adapterParams('perTask', { ...experiment, tasks }),
      adapterParams('moe', { ...experiment, tasks }),
    ]);
    expect(rows).toEqual([
      [110_592, 147_468],
      [147_456, 147_472],
      [184_320, 147_476],
      [221_184, 147_480],
      [294_912, 147_488],
    ]);
  });

  it('el enrutador tiene T × E parámetros', () => {
    expect(gateParams(5, 4)).toBe(20);
  });

  it('MoE-LoRA es más barato que por tarea desde T = 5 con E = 4', () => {
    expect(crossoverTasks({ experts: 4, rank: 2, splitRank: false })).toBe(5);
    expect(crossoverTasks({ experts: 8, rank: 2, splitRank: false })).toBe(9);
  });

  it('con rango dividido (MOELoRA) el costo de los expertos iguala al compartido', () => {
    const split = { ...experiment, rank: 16, experts: 8, splitRank: true };
    expect(adapterParams('moe', split) - gateParams(5, 8)).toBe(adapterParams('shared', split));
    expect(crossoverTasks(split)).toBe(2);
  });

  it('valida que r/E sea un entero positivo', () => {
    expect(splitRankIsValid(16, 8)).toBe(true);
    expect(splitRankIsValid(2, 4)).toBe(false);
  });
});
