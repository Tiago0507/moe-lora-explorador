/**
 * Sección "Costo": simulador del número de parámetros entrenables de adaptador y
 * enrutador en función de T, E y r, con el punto de cruce entre (ii) y (iii).
 */
import { CONFIGS, type ConfigId } from '../data/experiment';
import {
  adapterParams,
  crossoverTasks,
  loraParams,
  splitRankIsValid,
  type CostParams,
} from '../lib/cost';
import { byId, byIdAs, h, s, seriesVar } from '../lib/dom';
import { formatCompact, formatDecimal, formatInt } from '../lib/format';
import { linearScale, niceTicks } from '../lib/scale';
import { bindTooltip } from './tooltip';

const RANKS = [1, 2, 4, 8, 16] as const;
const T_MAX = 20;
const DEFAULTS = { tasks: 5, experts: 4, rankIndex: 1, splitRank: false };

function rankAt(index: number): number {
  return RANKS[Math.max(0, Math.min(RANKS.length - 1, index))] ?? 2;
}

function chart(p: CostParams, crossover: number | null): SVGSVGElement {
  const width = 720;
  const height = 360;
  const m = { top: 20, right: 120, bottom: 44, left: 64 };
  const series = CONFIGS.map((c) => ({
    id: c.id,
    label: c.label,
    values: Array.from({ length: T_MAX }, (_, i) => adapterParams(c.id, { ...p, tasks: i + 1 })),
  }));
  const maxY = Math.max(...series.flatMap((x) => x.values));
  const ticks = niceTicks(maxY, 5);
  const top = ticks[ticks.length - 1] ?? maxY;
  const x = linearScale([1, T_MAX], [m.left, width - m.right]);
  const y = linearScale([0, top], [height - m.bottom, m.top]);
  const svg = s('svg', {
    viewBox: `0 0 ${width} ${height}`,
    role: 'img',
    'aria-label': `Parámetros de adaptador y enrutador para T de 1 a ${T_MAX}. ${
      crossover
        ? `MoE-LoRA es más barato que LoRA por tarea desde T = ${crossover}.`
        : 'MoE-LoRA no llega a ser más barato que LoRA por tarea en este rango.'
    }`,
  });

  for (const v of ticks) {
    svg.append(
      s('line', { class: 'grid', x1: m.left, x2: width - m.right, y1: y(v), y2: y(v) }),
      s('text', { x: m.left - 8, y: y(v) + 4, 'text-anchor': 'end' }, formatCompact(v)),
    );
  }
  for (const t of [1, 5, 10, 15, 20]) {
    svg.append(
      s('text', { x: x(t), y: height - m.bottom + 20, 'text-anchor': 'middle' }, String(t)),
    );
  }
  svg.append(
    s(
      'text',
      {
        class: 'axis-label',
        x: (m.left + width - m.right) / 2,
        y: height - 4,
        'text-anchor': 'middle',
      },
      'número de tareas T',
    ),
    s('line', { class: 'baseline', x1: m.left, x2: width - m.right, y1: y(0), y2: y(0) }),
  );

  // Región donde MoE-LoRA ya es más barato que LoRA por tarea.
  if (crossover !== null && crossover <= T_MAX) {
    const x0 = x(Math.max(1, crossover - 0.5));
    svg.append(
      s('rect', {
        class: 'highlight-band',
        opacity: 0.7,
        x: x0,
        y: m.top,
        width: width - m.right - x0,
        height: height - m.top - m.bottom,
        rx: 8,
      }),
      s(
        'text',
        { class: 'axis-label', x: width - m.right - 10, y: m.top + 18, 'text-anchor': 'end' },
        `Zona donde MoE-LoRA es más barato (T ≥ ${crossover})`,
      ),
    );
  }

  // Tarea actual.
  svg.append(
    s('line', {
      x1: x(p.tasks),
      x2: x(p.tasks),
      y1: m.top,
      y2: height - m.bottom,
      style: 'stroke: var(--text-muted); stroke-width: 1',
    }),
  );

  const labelYs: number[] = [];
  for (const sr of series) {
    const d = sr.values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i + 1)},${y(v)}`).join(' ');
    svg.append(
      s('path', {
        d,
        style: `fill: none; stroke: ${seriesVar(sr.id)}; stroke-width: 2.5; stroke-linejoin: round; stroke-linecap: round`,
      }),
    );
    const current = sr.values[p.tasks - 1] ?? 0;
    svg.append(
      s('circle', {
        cx: x(p.tasks),
        cy: y(current),
        r: 6,
        style: `fill: ${seriesVar(sr.id)}; stroke: var(--surface); stroke-width: 2`,
      }),
    );
    // Etiqueta directa al final de la línea, solo si no choca con otra.
    const endY = y(sr.values[T_MAX - 1] ?? 0);
    if (labelYs.every((ly) => Math.abs(ly - endY) > 16)) {
      labelYs.push(endY);
      svg.append(s('text', { x: width - m.right + 10, y: endY + 4 }, sr.label));
    }
  }

  // Capa de interacción: una franja por valor de T.
  for (let t = 1; t <= T_MAX; t++) {
    const hit = s('rect', {
      class: 'hit',
      x: x(t) - (x(2) - x(1)) / 2,
      y: m.top,
      width: x(2) - x(1),
      height: height - m.top - m.bottom,
    });
    bindTooltip(hit, () => ({
      title: `T = ${t}`,
      rows: series.map((sr) => ({
        color: seriesVar(sr.id),
        label: sr.label,
        value: formatInt(sr.values[t - 1] ?? 0),
      })),
    }));
    svg.append(hit);
  }
  return svg;
}

function tiles(target: HTMLElement, p: CostParams): void {
  const v = (id: ConfigId): number => adapterParams(id, p);
  const shared = v('shared');
  const notes: Record<ConfigId, string> = {
    shared: 'constante en T',
    perTask: `${formatDecimal(v('perTask') / shared, 1)} × el compartido`,
    moe: `${formatDecimal(v('moe') / shared, 1)} × el compartido · ${
      v('moe') < v('perTask') ? '−' : '+'
    }${formatDecimal(Math.abs(1 - v('moe') / v('perTask')) * 100, 0)} % frente a (ii)`,
  };
  target.replaceChildren(
    ...CONFIGS.map((c) =>
      h(
        'div',
        { class: 'cost-tile', style: `--series-color: ${seriesVar(c.id)}` },
        h('div', { class: 'cost-tile__label' }, `${c.short} ${c.label}`),
        h('div', { class: 'cost-tile__value' }, formatInt(v(c.id))),
        h('div', { class: 'cost-tile__note' }, notes[c.id]),
      ),
    ),
  );
}

function table(target: HTMLElement, p: CostParams): void {
  const rows = [1, 2, 3, 4, 5, 6, 8, 10, 15, 20].map((t) =>
    h(
      'tr',
      {},
      h('th', { scope: 'row' }, `T = ${t}`),
      ...CONFIGS.map((c) => h('td', {}, formatInt(adapterParams(c.id, { ...p, tasks: t })))),
    ),
  );
  target.replaceChildren(
    h(
      'div',
      { class: 'table-scroll' },
      h(
        'table',
        {},
        h(
          'thead',
          {},
          h(
            'tr',
            {},
            h('th', { scope: 'col' }, 'Tareas'),
            ...CONFIGS.map((c) => h('th', { scope: 'col' }, `${c.short} ${c.label}`)),
          ),
        ),
        h('tbody', {}, ...rows),
      ),
    ),
  );
}

export function initCostSimulator(): void {
  const tasksIn = byIdAs('ctl-tasks', HTMLInputElement);
  const expertsIn = byIdAs('ctl-experts', HTMLInputElement);
  const rankIn = byIdAs('ctl-rank', HTMLInputElement);
  const splitIn = byIdAs('ctl-split', HTMLInputElement);
  const warning = byId('split-warning');

  const read = (): CostParams => ({
    tasks: Number(tasksIn.value),
    experts: Number(expertsIn.value),
    rank: rankAt(Number(rankIn.value)),
    splitRank: splitIn.checked,
  });

  const render = (): void => {
    const p = read();
    byId('out-tasks').textContent = String(p.tasks);
    byId('out-experts').textContent = String(p.experts);
    byId('out-rank').textContent = String(p.rank);
    rankIn.setAttribute('aria-valuetext', `r = ${p.rank}`);

    if (p.splitRank && !splitRankIsValid(p.rank, p.experts)) {
      warning.hidden = false;
      warning.textContent = `Con r = ${p.rank} y E = ${p.experts}, el rango por experto (${formatDecimal(p.rank / p.experts, 2)}) no es entero. MOELoRA usa, por ejemplo, r = 16 y N = 8: rango 2 por experto.`;
    } else {
      warning.hidden = true;
    }

    const cross = crossoverTasks(p);
    tiles(byId('cost-tiles'), p);
    byId('cost-chart').replaceChildren(chart(p, cross));
    table(byId('cost-table'), p);

    const L = loraParams(p.rank);
    const moeFormula = p.splitRank ? 'L + T·E' : 'E·L + T·E';
    byId('cost-formula').replaceChildren(
      h('strong', {}, `L = 12 · ${p.rank} · 1536 = ${formatInt(L)}`),
      ` por adaptador. Compartido = L, por tarea = T·L, MoE-LoRA = ${moeFormula}. `,
      cross === null
        ? 'En este rango MoE-LoRA no llega a ser más barato que LoRA por tarea.'
        : h('strong', {}, `MoE-LoRA es más barato que LoRA por tarea desde T = ${cross}.`),
    );
  };

  for (const el of [tasksIn, expertsIn, rankIn, splitIn]) el.addEventListener('input', render);
  byId('cost-reset').addEventListener('click', () => {
    tasksIn.value = String(DEFAULTS.tasks);
    expertsIn.value = String(DEFAULTS.experts);
    rankIn.value = String(DEFAULTS.rankIndex);
    splitIn.checked = DEFAULTS.splitRank;
    render();
  });
  byId('cost-legend').replaceChildren(
    ...CONFIGS.map((c) =>
      h(
        'span',
        { class: 'legend__item' },
        h('i', { class: 'swatch', style: `--series-color: ${seriesVar(c.id)}` }),
        `${c.short} ${c.label}`,
      ),
    ),
  );
  render();
}
