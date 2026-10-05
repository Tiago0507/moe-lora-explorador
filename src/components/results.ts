/**
 * Sección "Resultados": el público vota, se revelan los promedios, las barras por
 * tarea y un gráfico de diferencias frente al compartido con la banda de ruido.
 */
import {
  AVERAGES,
  CONFIGS,
  METRICS,
  SETUP,
  TASKS,
  type ConfigId,
  type TaskId,
} from '../data/experiment';
import { byId, h, prefersReducedMotion, s, seriesVar, wireRadioGroup } from '../lib/dom';
import { formatDecimal, formatSigned } from '../lib/format';
import { linearScale, niceTicks } from '../lib/scale';
import { binomialHalfWidth, diffPp } from '../lib/stats';
import { bindTooltip } from './tooltip';

type Metric = 'macroF1' | 'accuracy';

const METRIC_LABEL: Record<Metric, string> = { macroF1: 'macro-F1', accuracy: 'exactitud' };
/** Tareas donde el paper encuentra la brecha frente al compartido. */
const SIGNAL_TASKS: readonly TaskId[] = ['rating5', 'length'];

function configLabel(id: ConfigId): string {
  const c = CONFIGS.find((x) => x.id === id);
  return c ? `${c.short} ${c.label}` : id;
}

function legend(target: HTMLElement, configs: readonly ConfigId[], band = false): void {
  target.replaceChildren(
    ...configs.map((id) =>
      h(
        'span',
        { class: 'legend__item' },
        h('i', { class: 'swatch', style: `--series-color: ${seriesVar(id)}` }),
        configLabel(id),
      ),
    ),
    ...(band
      ? [
          h(
            'span',
            { class: 'legend__item' },
            h('i', { class: 'legend__band' }),
            'Banda de ruido aproximada (95 %)',
          ),
        ]
      : []),
  );
}

/* ---------- Barras agrupadas por tarea ---------- */
function barsChart(metric: Metric): SVGSVGElement {
  const width = 960;
  const height = 320;
  const m = { top: 16, right: 8, bottom: 40, left: 44 };
  const innerW = width - m.left - m.right;
  const band = innerW / TASKS.length;
  const barW = 24;
  const gap = 2;
  const y = linearScale([0, 1], [height - m.bottom, m.top]);
  const svg = s('svg', {
    viewBox: `0 0 ${width} ${height}`,
    role: 'img',
    'aria-label': `${METRIC_LABEL[metric]} por tarea para las tres configuraciones. Los detalles están en la tabla.`,
  });

  TASKS.forEach((t, i) => {
    if (SIGNAL_TASKS.includes(t.id)) {
      svg.append(
        s('rect', {
          class: 'highlight-band',
          x: m.left + i * band + 6,
          y: m.top,
          width: band - 12,
          height: height - m.top - m.bottom,
          rx: 10,
        }),
      );
    }
  });

  for (const v of niceTicks(1, 5)) {
    svg.append(
      s('line', { class: 'grid', x1: m.left, x2: width - m.right, y1: y(v), y2: y(v) }),
      s('text', { x: m.left - 8, y: y(v) + 4, 'text-anchor': 'end' }, formatDecimal(v, 1)),
    );
  }

  const animate = !prefersReducedMotion();
  TASKS.forEach((t, i) => {
    const cx = m.left + i * band + band / 2;
    const groupW = CONFIGS.length * barW + (CONFIGS.length - 1) * gap;
    CONFIGS.forEach((c, j) => {
      const value = METRICS[c.id][t.id][metric];
      const x = cx - groupW / 2 + j * (barW + gap);
      const top = y(value);
      const base = y(0);
      // Extremo de datos redondeado (4 px), base recta.
      const r = 4;
      const d = `M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${base} Z`;
      const bar = s('path', { class: 'bar', d, style: `fill: ${seriesVar(c.id)}` });
      if (animate) {
        bar.style.transformOrigin = `0 ${base}px`;
        bar.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], {
          duration: 600,
          delay: i * 60 + j * 40,
          easing: 'cubic-bezier(.2,.8,.2,1)',
          fill: 'backwards',
        });
      }
      svg.append(bar);
    });
    svg.append(
      s(
        'text',
        { class: 'task-label', x: cx, y: height - m.bottom + 22, 'text-anchor': 'middle' },
        t.id,
      ),
    );
    const hit = s('rect', {
      class: 'hit',
      x: m.left + i * band,
      y: m.top,
      width: band,
      height: height - m.top - m.bottom,
      tabindex: 0,
      role: 'button',
      'aria-label': `${t.id}: ${CONFIGS.map((c) => `${c.label} ${formatDecimal(METRICS[c.id][t.id][metric], 4)}`).join(', ')}`,
    });
    bindTooltip(hit, () => ({
      title: `${t.id} · ${METRIC_LABEL[metric]}`,
      rows: CONFIGS.map((c) => ({
        color: seriesVar(c.id),
        label: c.label,
        value: formatDecimal(METRICS[c.id][t.id][metric], 4),
      })),
    }));
    svg.append(hit);
  });
  svg.append(s('line', { class: 'baseline', x1: m.left, x2: width - m.right, y1: y(0), y2: y(0) }));
  return svg;
}

/* ---------- Diferencias frente al compartido ---------- */
function diffChart(metric: Metric): SVGSVGElement {
  const width = 960;
  const rowH = 52;
  const m = { top: 24, right: 220, bottom: 36, left: 120 };
  const height = m.top + m.bottom + rowH * TASKS.length;
  const domain = 6;
  const x = linearScale([-domain, domain], [m.left, width - m.right]);
  const svg = s('svg', {
    viewBox: `0 0 ${width} ${height}`,
    role: 'img',
    'aria-label': `Diferencia de ${METRIC_LABEL[metric]} de LoRA por tarea y MoE-LoRA frente al compartido, con la banda de ruido aproximada.`,
  });

  for (let v = -domain; v <= domain; v += 2) {
    svg.append(
      s('line', {
        class: v === 0 ? 'baseline' : 'grid',
        x1: x(v),
        x2: x(v),
        y1: m.top - 8,
        y2: height - m.bottom,
      }),
      s(
        'text',
        { x: x(v), y: height - m.bottom + 20, 'text-anchor': 'middle' },
        formatSigned(v, 0),
      ),
    );
  }
  svg.append(
    s(
      'text',
      { class: 'axis-label', x: x(0), y: height - 2, 'text-anchor': 'middle' },
      'puntos porcentuales frente a (i) compartido',
    ),
    s('text', { class: 'axis-label', x: width - m.right + 24, y: m.top - 8 }, '(ii)'),
    s('text', { class: 'axis-label', x: width - m.right + 110, y: m.top - 8 }, '(iii)'),
  );

  TASKS.forEach((t, i) => {
    const cy = m.top + i * rowH + rowH / 2;
    const base = METRICS.shared[t.id];
    // La banda usa la exactitud del compartido como p, también en modo F1 (aproximación).
    const hw = binomialHalfWidth(base.accuracy, SETUP.testPerTask) * 100;
    svg.append(
      s('rect', {
        x: x(-hw),
        y: cy - 14,
        width: x(hw) - x(-hw),
        height: 28,
        rx: 6,
        style: 'fill: var(--band)',
      }),
      s('text', { class: 'task-label', x: m.left - 14, y: cy + 4, 'text-anchor': 'end' }, t.id),
    );
    const others: ConfigId[] = ['perTask', 'moe'];
    others.forEach((id, j) => {
      const d = diffPp(METRICS[id][t.id][metric], base[metric]);
      const dot = s('circle', {
        class: 'dot',
        cx: x(Math.max(-domain, Math.min(domain, d))),
        cy: cy + (j === 0 ? -5 : 5),
        r: 7,
        tabindex: 0,
        role: 'button',
        'aria-label': `${t.id}, ${configLabel(id)}: ${formatSigned(d, 2)} puntos`,
        style: `fill: ${seriesVar(id)}; stroke: var(--surface); stroke-width: 2`,
      });
      bindTooltip(dot, () => ({
        title: `${t.id} · ${configLabel(id)}`,
        rows: [
          {
            color: seriesVar(id),
            label: `Diferencia de ${METRIC_LABEL[metric]}`,
            value: `${formatSigned(d, 2)} pp`,
          },
          { label: 'Banda de ruido', value: `±${formatDecimal(hw, 1)} pp` },
        ],
      }));
      svg.append(
        dot,
        s(
          'text',
          {
            class: 'value-label',
            x: width - m.right + 24 + j * 86,
            y: cy + 4,
          },
          formatSigned(d, 2),
        ),
      );
    });
  });
  return svg;
}

/* ---------- Tarjetas de promedio, veredicto y tabla ---------- */
function avgCards(target: HTMLElement, metric: Metric): void {
  const best = CONFIGS.reduce((a, c) => (AVERAGES[c.id][metric] > AVERAGES[a.id][metric] ? c : a));
  target.replaceChildren(
    ...CONFIGS.map((c) => {
      const v = AVERAGES[c.id][metric];
      const delta = diffPp(v, AVERAGES.shared[metric]);
      return h(
        'div',
        { class: 'avg-card' },
        c.id === best.id ? h('span', { class: 'avg-card__badge' }, 'más alta') : null,
        h(
          'div',
          { class: 'avg-card__label' },
          h('i', { class: 'swatch', style: `--series-color: ${seriesVar(c.id)}` }),
          `${c.short} ${c.label}`,
        ),
        h('div', { class: 'avg-card__value' }, formatDecimal(v, 4)),
        h(
          'div',
          { class: 'avg-card__delta' },
          c.id === 'shared'
            ? `${METRIC_LABEL[metric]} promedio · referencia`
            : `${formatSigned(delta, 2)} pp frente a (i)`,
        ),
      );
    }),
  );
}

function verdict(vote: ConfigId | null): string {
  const gap = formatDecimal(diffPp(AVERAGES.moe.macroF1, AVERAGES.perTask.macroF1), 2);
  const tail = `MoE-LoRA y LoRA por tarea quedan separados por ${gap} pp de macro-F1, una diferencia que equivale a menos de un ejemplo de prueba por tarea.`;
  switch (vote) {
    case 'moe':
      return `Votaste por MoE-LoRA. Tiene la macro-F1 promedio más alta, pero por muy poco. ${tail}`;
    case 'perTask':
      return `Votaste por LoRA por tarea. Queda segunda en macro-F1 y primera en exactitud. ${tail}`;
    case 'shared':
      return `Votaste por el LoRA compartido. Es el más bajo en promedio, aunque gana en sentiment y topic. ${tail}`;
    default:
      return tail;
  }
}

function insights(target: HTMLElement): void {
  const items: { value: string; text: string }[] = [
    {
      value: `${formatSigned(diffPp(METRICS.moe.rating5.macroF1, METRICS.shared.rating5.macroF1), 2)} pp`,
      text: 'en rating5 para MoE-LoRA frente al compartido (+3.60 pp para por tarea). Es la brecha más grande y aun así queda dentro de la banda de ±4.9 pp.',
    },
    {
      value: '0.25 pp',
      text: 'vale un solo ejemplo de prueba en exactitud (1 de 400). La diferencia entre (ii) y (iii) es menor que eso en el promedio.',
    },
    {
      value: '1 semilla',
      text: 'sin varianza entre corridas. La banda es una aproximación analítica, no un intervalo medido.',
    },
  ];
  target.replaceChildren(
    ...items.map((it) =>
      h(
        'div',
        { class: 'insight' },
        h('div', { class: 'insight__value' }, it.value),
        h('p', {}, it.text),
      ),
    ),
  );
}

function table(target: HTMLElement): void {
  const best = (task: TaskId, metric: Metric): number =>
    Math.max(...CONFIGS.map((c) => METRICS[c.id][task][metric]));
  const head = h(
    'tr',
    {},
    h('th', { scope: 'col' }, 'Configuración'),
    ...TASKS.map((t) => h('th', { scope: 'col' }, `F1 ${t.id}`)),
    h('th', { scope: 'col' }, 'F1 prom.'),
    h('th', { scope: 'col' }, 'Exactitud prom.'),
  );
  const rows = CONFIGS.map((c) =>
    h(
      'tr',
      {},
      h('th', { scope: 'row' }, `${c.short} ${c.label}`),
      ...TASKS.map((t) => {
        const v = METRICS[c.id][t.id].macroF1;
        return h(
          'td',
          { class: v === best(t.id, 'macroF1') ? 'is-best' : '' },
          formatDecimal(v, 4),
        );
      }),
      h('td', {}, formatDecimal(AVERAGES[c.id].macroF1, 4)),
      h('td', {}, formatDecimal(AVERAGES[c.id].accuracy, 4)),
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
          'caption',
          { class: 'sr-only' },
          'Macro-F1 en prueba por tarea; en negrita el mejor valor de cada tarea.',
        ),
        h('thead', {}, head),
        h('tbody', {}, ...rows),
      ),
    ),
  );
}

export function initResults(): void {
  const voteEl = byId('vote');
  const reveal = byId('reveal');
  const verdictEl = byId('verdict');
  let metric: Metric = 'macroF1';

  const render = (): void => {
    avgCards(byId('avg-row'), metric);
    byId('bars-chart').replaceChildren(barsChart(metric));
    byId('diff-chart').replaceChildren(diffChart(metric));
  };

  const open = (vote: ConfigId | null): void => {
    for (const b of voteEl.querySelectorAll<HTMLButtonElement>('[data-vote]')) {
      b.setAttribute('aria-pressed', String(b.dataset.vote === vote));
    }
    verdictEl.textContent = verdict(vote);
    const first = reveal.hidden;
    reveal.hidden = false;
    if (first) {
      render();
      reveal.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'start',
      });
    }
  };

  voteEl.append(
    ...CONFIGS.map((c) => {
      const btn = h(
        'button',
        {
          type: 'button',
          class: 'vote__option',
          'data-vote': c.id,
          'aria-pressed': 'false',
          style: `--series-color: ${seriesVar(c.id)}`,
        },
        h('strong', {}, `${c.short} ${c.label}`),
        h('span', {}, c.description),
      );
      btn.addEventListener('click', () => {
        open(c.id);
      });
      return btn;
    }),
    (() => {
      const skip = h(
        'button',
        { type: 'button', class: 'button button--ghost' },
        'Revelar sin votar',
      );
      skip.addEventListener('click', () => {
        open(null);
      });
      return skip;
    })(),
  );

  legend(byId('results-legend'), ['shared', 'perTask', 'moe']);
  legend(byId('diff-legend'), ['perTask', 'moe'], true);
  insights(byId('results-insights'));
  table(byId('results-table'));

  wireRadioGroup(byId('metric-toggle'), (btn) => {
    metric = btn.dataset.metric === 'accuracy' ? 'accuracy' : 'macroF1';
    if (!reveal.hidden) render();
  });
}
