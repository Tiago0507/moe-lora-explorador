/**
 * Modelo analítico del costo de ajuste (parámetros entrenables de adaptador y
 * enrutador). Reproduce la celda 32 del notebook y la sección III-C del paper:
 *   (i) compartido  = L
 *   (ii) por tarea  = T · L
 *   (iii) MoE-LoRA  = E · L + T · E      (expertos de rango r completo)
 *   (iii) con rango dividido r/E, como MOELoRA: L + T · E
 * Las cabezas de clasificación crecen igual en las tres y no se incluyen.
 */
import type { ConfigId } from '../data/experiment';

export interface CostParams {
  /** Número de tareas T. */
  readonly tasks: number;
  /** Número de expertos E. */
  readonly experts: number;
  /** Rango LoRA r. */
  readonly rank: number;
  /** Si es verdadero, cada experto tiene rango r/E (MOELoRA) en lugar de r. */
  readonly splitRank: boolean;
}

export interface ModelShape {
  readonly projections: number;
  readonly dIn: number;
  readonly dOut: number;
}

/** DistilBERT: 6 capas × (q_lin, v_lin), 768 → 768. */
export const DISTILBERT_SHAPE: ModelShape = { projections: 12, dIn: 768, dOut: 768 };

/** Parámetros de un adaptador LoRA de rango `rank` sobre todas las proyecciones (L). */
export function loraParams(rank: number, shape: ModelShape = DISTILBERT_SHAPE): number {
  return shape.projections * rank * (shape.dIn + shape.dOut);
}

/** Parámetros del enrutador por tarea: una tabla de embeddings T × E. */
export function gateParams(tasks: number, experts: number): number {
  return tasks * experts;
}

export function adapterParams(
  config: ConfigId,
  p: CostParams,
  shape: ModelShape = DISTILBERT_SHAPE,
): number {
  const L = loraParams(p.rank, shape);
  switch (config) {
    case 'shared':
      return L;
    case 'perTask':
      return p.tasks * L;
    case 'moe':
      return (p.splitRank ? L : p.experts * L) + gateParams(p.tasks, p.experts);
  }
}

/**
 * Menor número de tareas T (entre 1 y `maxTasks`) a partir del cual MoE-LoRA
 * entrena estrictamente menos parámetros que LoRA por tarea. `null` si no ocurre.
 */
export function crossoverTasks(
  p: Omit<CostParams, 'tasks'>,
  maxTasks = 200,
  shape: ModelShape = DISTILBERT_SHAPE,
): number | null {
  for (let tasks = 1; tasks <= maxTasks; tasks++) {
    const params = { ...p, tasks };
    if (adapterParams('moe', params, shape) < adapterParams('perTask', params, shape)) {
      return tasks;
    }
  }
  return null;
}

/** El rango por experto r/E solo tiene sentido si es entero. */
export function splitRankIsValid(rank: number, experts: number): boolean {
  return Number.isInteger(rank / experts) && rank / experts >= 1;
}
