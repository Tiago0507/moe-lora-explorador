/**
 * Sección "Configuraciones": el usuario elige una tarea y cada tarjeta muestra
 * qué parámetros la atienden en (i), (ii) y (iii).
 */
import {
  CONFIGS,
  COSTS,
  ROUTER_RAW,
  SETUP,
  TASKS,
  type ConfigId,
  type TaskId,
} from '../data/experiment';
import { byId, h, onSeriesVar, s, seriesVar, wireRadioGroup } from '../lib/dom';
import { formatDecimal, formatInt } from '../lib/format';
import { effectiveWeights } from '../lib/router';

const W = 300;
const HEIGHT = 196;

function frozenBlock(): SVGGElement {
  return s(
    'g',
    {},
    s('rect', {
      x: 20,
      y: 10,
      width: W - 40,
      height: 34,
      rx: 6,
      style: 'fill: var(--surface-3)',
    }),
    s('text', { x: W / 2, y: 32, 'text-anchor': 'middle' }, 'W₀ congelada (DistilBERT)'),
  );
}

function arrow(x1: number, y1: number, x2: number, y2: number, on: boolean): SVGLineElement {
  return s('line', {
    x1,
    y1,
    x2,
    y2,
    style: `stroke: ${on ? 'var(--text-primary)' : 'var(--border)'}; stroke-width: ${on ? 2 : 1}`,
  });
}

function taskRow(selected: TaskId): SVGGElement {
  const g = s('g', {});
  TASKS.forEach((t, i) => {
    const x = 40 + i * 55;
    const on = t.id === selected;
    g.append(
      s('circle', {
        cx: x,
        cy: 178,
        r: on ? 7 : 5,
        style: `fill: ${on ? 'var(--accent)' : 'var(--surface-3)'}`,
      }),
    );
  });
  return g;
}

function diagram(config: ConfigId, task: TaskId): SVGSVGElement {
  const color = seriesVar(config);
  const taskIndex = TASKS.findIndex((t) => t.id === task);
  const svg = s('svg', {
    viewBox: `0 0 ${W} ${HEIGHT}`,
    role: 'img',
    'aria-label': describe(config, task),
  });
  svg.append(frozenBlock());

  if (config === 'shared') {
    svg.append(
      s('rect', { x: 60, y: 76, width: W - 120, height: 40, rx: 8, style: `fill: ${color}` }),
      s(
        'text',
        {
          x: W / 2,
          y: 101,
          'text-anchor': 'middle',
          style: `fill: ${onSeriesVar(config)}; font-weight: 600`,
        },
        'A · B (un adaptador)',
      ),
      arrow(W / 2, 76, W / 2, 44, true),
    );
    TASKS.forEach((_, i) => {
      const x = 40 + i * 55;
      svg.append(arrow(x, 171, W / 2 + (x - W / 2) * 0.35, 116, i === taskIndex));
    });
  }

  if (config === 'perTask') {
    TASKS.forEach((_, i) => {
      const x = 40 + i * 55;
      const on = i === taskIndex;
      svg.append(
        s('rect', {
          x: x - 20,
          y: 76,
          width: 40,
          height: 40,
          rx: 8,
          style: `fill: ${on ? color : 'var(--surface-2)'}; stroke: ${on ? 'none' : 'var(--border)'}`,
        }),
        s(
          'text',
          {
            x,
            y: 101,
            'text-anchor': 'middle',
            style: `fill: ${on ? onSeriesVar(config) : 'var(--text-muted)'}; font-weight: 600`,
          },
          `A${i + 1}`,
        ),
        arrow(x, 171, x, 116, on),
      );
      if (on) svg.append(arrow(x, 76, x, 44, true));
    });
  }

  if (config === 'moe') {
    const w = effectiveWeights(ROUTER_RAW[task], SETUP.gateTemperature, SETUP.gateTopK);
    const gateX = W / 2;
    const boxTop = 60;
    const boxH = 54;
    const gateTop = 138;
    w.forEach((weight, i) => {
      const x = 60 + i * 60;
      const on = weight > 0;
      // Con poco peso el relleno es tenue: el texto usa la tinta del tema.
      const ink = !on
        ? 'var(--text-muted)'
        : weight >= 0.5
          ? onSeriesVar(config)
          : 'var(--text-primary)';
      if (on) {
        // Grosor de la conexión proporcional al peso que el router le da al experto.
        svg.append(
          s('line', {
            x1: gateX,
            y1: gateTop,
            x2: x,
            y2: boxTop + boxH,
            style: `stroke: var(--accent); stroke-width: ${1.5 + 5 * weight}; stroke-linecap: round`,
          }),
          arrow(x, boxTop, x, 44, true),
        );
      }
      svg.append(
        s('rect', {
          x: x - 24,
          y: boxTop,
          width: 48,
          height: boxH,
          rx: 8,
          style: on
            ? `fill: ${color}; opacity: ${0.45 + 0.55 * weight}`
            : 'fill: var(--surface-2); stroke: var(--border)',
        }),
        s(
          'text',
          { x, y: boxTop + 22, 'text-anchor': 'middle', style: `fill: ${ink}; font-weight: 600` },
          `E${i}`,
        ),
        s(
          'text',
          {
            x,
            y: boxTop + 42,
            'text-anchor': 'middle',
            style: `fill: ${ink}; font-size: 12px; font-variant-numeric: tabular-nums`,
          },
          on ? formatDecimal(weight, 2) : '0',
        ),
      );
    });
    svg.append(
      s('rect', {
        x: gateX - 64,
        y: gateTop,
        width: 128,
        height: 24,
        rx: 12,
        style: 'fill: var(--accent-soft); stroke: var(--accent)',
      }),
      s(
        'text',
        {
          x: gateX,
          y: gateTop + 16,
          'text-anchor': 'middle',
          style: 'fill: var(--accent); font-size: 12px; font-weight: 600',
        },
        'router(t) · top-2',
      ),
      arrow(40 + taskIndex * 55, 171, gateX, gateTop + 24, true),
    );
  }

  svg.append(taskRow(task));
  return svg;
}

function describe(config: ConfigId, task: TaskId): string {
  if (config === 'shared') return `La tarea ${task} usa el único adaptador compartido.`;
  if (config === 'perTask') return `La tarea ${task} usa solo su propio adaptador.`;
  const w = effectiveWeights(ROUTER_RAW[task], SETUP.gateTemperature, SETUP.gateTopK);
  const used = w
    .map((x, i) => ({ x, i }))
    .filter((e) => e.x > 0)
    .map((e) => `experto ${e.i} con peso ${formatDecimal(e.x, 2)}`);
  return `La tarea ${task} usa ${used.join(' y ')}.`;
}

export function initConfigs(): void {
  const picker = byId('task-picker');
  const grid = byId('config-grid');
  const detail = byId('task-detail');
  let task: TaskId = 'rating5';

  picker.append(
    ...TASKS.map((t) =>
      h(
        'button',
        {
          type: 'button',
          class: 'chip',
          role: 'radio',
          'aria-checked': String(t.id === task),
          'data-task': t.id,
        },
        t.id,
      ),
    ),
  );

  const cards = CONFIGS.map((c) => {
    const holder = h('div', {});
    const card = h(
      'article',
      { class: 'config-card', style: `--series-color: ${seriesVar(c.id)}` },
      h(
        'div',
        { class: 'config-card__head' },
        h('span', { class: 'config-card__num' }, c.short),
        h('h3', {}, c.label),
      ),
      h('p', {}, c.description),
      holder,
      h(
        'div',
        { class: 'config-card__cost' },
        h('span', {}, 'Parámetros adaptador + router'),
        h('strong', {}, formatInt(COSTS[c.id].adapterRouterParams)),
      ),
    );
    grid.append(card);
    return { id: c.id, holder };
  });

  const render = (): void => {
    const info = TASKS.find((t) => t.id === task);
    detail.replaceChildren(
      h('strong', {}, info ? `${info.id}: ` : ''),
      info ? `${info.description} ${info.classes} clases, ${info.source}, ${info.nature}.` : '',
    );
    for (const c of cards) c.holder.replaceChildren(diagram(c.id, task));
  };

  wireRadioGroup(picker, (btn) => {
    task = (btn.dataset.task ?? task) as TaskId;
    render();
  });
  render();
}
