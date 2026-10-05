/**
 * Datos del experimento, copiados literalmente de las salidas ejecutadas de
 * `moe_peft_multitarea.ipynb`. Cada bloque indica la celda de origen para que
 * cualquier cifra de la página se pueda rastrear.
 */

export type ConfigId = 'shared' | 'perTask' | 'moe';
export type TaskId = 'sentiment' | 'rating5' | 'amazon_sent' | 'topic' | 'length';

export interface ConfigInfo {
  readonly id: ConfigId;
  readonly short: string;
  readonly label: string;
  readonly description: string;
}

export interface TaskInfo {
  readonly id: TaskId;
  readonly classes: number;
  readonly source: string;
  readonly nature: string;
  readonly description: string;
}

export const CONFIGS: readonly ConfigInfo[] = [
  {
    id: 'shared',
    short: '(i)',
    label: 'LoRA compartido',
    description: 'Un solo adaptador para las cinco tareas.',
  },
  {
    id: 'perTask',
    short: '(ii)',
    label: 'LoRA por tarea',
    description: 'Un adaptador independiente por tarea.',
  },
  {
    id: 'moe',
    short: '(iii)',
    label: 'MoE-LoRA',
    description: 'Cuatro expertos LoRA y un enrutador que elige dos según la tarea.',
  },
];

/** Celda 6 y 7: definición de tareas y fuentes. */
export const TASKS: readonly TaskInfo[] = [
  {
    id: 'sentiment',
    classes: 3,
    source: 'Yelp',
    nature: 'polaridad',
    description: 'Sentimiento negativo, neutro o positivo.',
  },
  {
    id: 'rating5',
    classes: 5,
    source: 'Yelp',
    nature: 'polaridad ordinal',
    description: 'Valoración de 1 a 5 estrellas.',
  },
  {
    id: 'amazon_sent',
    classes: 2,
    source: 'Amazon Polarity',
    nature: 'polaridad, otro dominio',
    description: 'Sentimiento de reseñas de producto.',
  },
  {
    id: 'topic',
    classes: 3,
    source: 'Yelp, IMDB y Amazon',
    nature: 'ortogonal (dominio)',
    description: 'De qué fuente viene la reseña: restaurante, película o producto.',
  },
  {
    id: 'length',
    classes: 3,
    source: 'Yelp',
    nature: 'ortogonal (forma)',
    description: 'Longitud de la reseña: corta, media o larga.',
  },
];

export const TASK_IDS: readonly TaskId[] = TASKS.map((t) => t.id);

export interface TaskMetrics {
  readonly accuracy: number;
  readonly macroF1: number;
}

/** Celda 25 (`summary_df`): métricas en prueba, 400 ejemplos por tarea. */
export const METRICS: Readonly<Record<ConfigId, Readonly<Record<TaskId, TaskMetrics>>>> = {
  shared: {
    sentiment: { accuracy: 0.7825, macroF1: 0.7304 },
    rating5: { accuracy: 0.5125, macroF1: 0.5177 },
    amazon_sent: { accuracy: 0.9025, macroF1: 0.9024 },
    topic: { accuracy: 0.9625, macroF1: 0.9619 },
    length: { accuracy: 0.9225, macroF1: 0.9224 },
  },
  perTask: {
    sentiment: { accuracy: 0.7675, macroF1: 0.7272 },
    rating5: { accuracy: 0.5575, macroF1: 0.5537 },
    amazon_sent: { accuracy: 0.9025, macroF1: 0.9023 },
    topic: { accuracy: 0.96, macroF1: 0.9591 },
    length: { accuracy: 0.94, macroF1: 0.9405 },
  },
  moe: {
    sentiment: { accuracy: 0.775, macroF1: 0.7279 },
    rating5: { accuracy: 0.5425, macroF1: 0.5563 },
    amazon_sent: { accuracy: 0.905, macroF1: 0.9047 },
    topic: { accuracy: 0.9625, macroF1: 0.9616 },
    length: { accuracy: 0.9375, macroF1: 0.937 },
  },
};

/** Celda 25: promedios reportados por el notebook (4 decimales). */
export const AVERAGES: Readonly<Record<ConfigId, TaskMetrics>> = {
  shared: { accuracy: 0.8165, macroF1: 0.807 },
  perTask: { accuracy: 0.8255, macroF1: 0.8165 },
  moe: { accuracy: 0.8245, macroF1: 0.8175 },
};

export interface RunCost {
  readonly adapterRouterParams: number;
  readonly totalTrainableParams: number;
  readonly trainSeconds: number;
  readonly peakMemoryMb: number;
}

/** Celdas 16, 23 y 25: costo medido de cada configuración (T = 5, E = 4, r = 2). */
export const COSTS: Readonly<Record<ConfigId, RunCost>> = {
  shared: {
    adapterRouterParams: 36_864,
    totalTrainableParams: 49_168,
    trainSeconds: 298.3,
    peakMemoryMb: 966,
  },
  perTask: {
    adapterRouterParams: 184_320,
    totalTrainableParams: 196_624,
    trainSeconds: 332.5,
    peakMemoryMb: 966,
  },
  moe: {
    adapterRouterParams: 147_476,
    totalTrainableParams: 159_780,
    trainSeconds: 331.5,
    peakMemoryMb: 966,
  },
};

/** Celdas 9, 15 y 18: arquitectura e hiperparámetros comunes. */
export const SETUP = {
  baseModel: 'distilbert-base-uncased',
  baseModelParamsMillions: 66,
  hiddenSize: 768,
  injectedProjections: 12,
  loraRank: 2,
  loraAlpha: 4,
  numExperts: 4,
  numTasks: 5,
  gateTemperature: 0.5,
  gateTopK: 2,
  trainSteps: 1500,
  batchSize: 16,
  learningRate: 5e-4,
  maxTokens: 192,
  trainPerTask: 2000,
  testPerTask: 400,
  seed: 42,
  gpu: 'Tesla T4',
  headParams: 12_304,
} as const;

/**
 * Celda 35: `softmax` de los parámetros crudos del enrutador, tal como lo muestra
 * el mapa de calor del notebook (redondeado a 2 decimales). No incluye la
 * temperatura ni el top-k que el modelo aplica al entrenar.
 */
export const ROUTER_RAW: Readonly<Record<TaskId, readonly number[]>> = {
  sentiment: [0.32, 0.17, 0.39, 0.12],
  rating5: [0.05, 0.05, 0.76, 0.14],
  amazon_sent: [0.19, 0.16, 0.56, 0.09],
  topic: [0.07, 0.46, 0.08, 0.39],
  length: [0.56, 0.27, 0.1, 0.07],
};

/** Celda 35: entropía normalizada reportada por el notebook (sobre los pesos crudos). */
export const ROUTER_RAW_ENTROPY_REPORTED: Readonly<Record<TaskId, number>> = {
  sentiment: 0.927,
  rating5: 0.571,
  amazon_sent: 0.831,
  topic: 0.798,
  length: 0.798,
};

/**
 * Celda 23: pérdida media de los últimos 50 pasos, por tarea, en dos momentos del
 * entrenamiento. Sirve para contar dónde aprende más lento el adaptador compartido.
 */
export const LOSS_SNAPSHOTS: readonly {
  readonly step: number;
  readonly task: TaskId;
  readonly values: Readonly<Record<ConfigId, number>>;
}[] = [
  { step: 400, task: 'length', values: { shared: 0.401, perTask: 0.194, moe: 0.17 } },
  { step: 1500, task: 'rating5', values: { shared: 1.137, perTask: 0.994, moe: 1.05 } },
];
