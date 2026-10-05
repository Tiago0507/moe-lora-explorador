/**
 * Sección "Router": mapa tarea × experto con pesos crudos (los del notebook) o
 * efectivos (con temperatura y top-k), y la entropía normalizada por tarea.
 */
import {
  ROUTER_RAW,
  ROUTER_RAW_ENTROPY_REPORTED,
  SETUP,
  TASKS,
  type TaskId,
} from '../data/experiment';
import { byId, byIdAs, h, s, wireRadioGroup } from '../lib/dom';
import { formatDecimal } from '../lib/format';
import { linearScale } from '../lib/scale';
import { effectiveWeights, normalizedEntropy, rankedExperts } from '../lib/router';
import { bindTooltip } from './tooltip';

type Mode = 'raw' | 'effective';

interface State {
  mode: Mode;
  tau: number;
  topK: number;
}

const POLARITY: readonly TaskId[] = ['sentiment', 'rating5', 'amazon_sent'];
const EXPERTS = SETUP.numExperts;

function weightsFor(task: TaskId, st: State): number[] {
  return st.mode === 'raw'
    ? [...ROUTER_RAW[task]]
    : effectiveWeights(ROUTER_RAW[task], st.tau, st.topK);
}

function entropyFor(task: TaskId, st: State): number {
  // En modo crudo se muestran las entropías exactas que imprime el notebook.
  return st.mode === 'raw'
    ? ROUTER_RAW_ENTROPY_REPORTED[task]
    : normalizedEntropy(weightsFor(task, st));
}

/* ---------- Color secuencial (un solo tono) ---------- */
function parseHex(hex: string): [number, number, number] {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex.trim());
  if (!m) return [128, 128, 128];
  return [parseInt(m[1] ?? '80', 16), parseInt(m[2] ?? '80', 16), parseInt(m[3] ?? '80', 16)];
}

function luminance([r, g, b]: readonly number[]): number {
  const lin = (c: number): number => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r ?? 0) + 0.7152 * lin(g ?? 0) + 0.0722 * lin(b ?? 0);
}

function heatColor(t: number): { fill: string; ink: string } {
  const css = getComputedStyle(document.documentElement);
  const a = parseHex(css.getPropertyValue('--heat-0'));
  const b = parseHex(css.getPropertyValue('--heat-1'));
  const c = a.map((v, i) => Math.round(v + ((b[i] ?? v) - v) * Math.min(1, Math.max(0, t))));
  const L = luminance(c);
  return { fill: `rgb(${c.join(',')})`, ink: L > 0.2 ? '#16181d' : '#f3f2ee' };
}

/* ---------- Mapa de calor ---------- */
function heatmap(st: State): SVGSVGElement {
  const cell = 92;
  const m = { top: 36, left: 120, right: 8, bottom: 8 };
  const width = m.left + EXPERTS * cell + m.right;
  const height = m.top + TASKS.length * 64 + m.bottom;
  const rowH = 64;
  const svg = s('svg', {
    viewBox: `0 0 ${width} ${height}`,
    role: 'img',
    'aria-label': `Pesos ${st.mode === 'raw' ? 'crudos' : 'efectivos'} del enrutador por tarea y experto.`,
  });
  for (let e = 0; e < EXPERTS; e++) {
    svg.append(
      s(
        'text',
        { x: m.left + e * cell + cell / 2, y: m.top - 12, 'text-anchor': 'middle' },
        `exp ${e}`,
      ),
    );
  }
  TASKS.forEach((t, i) => {
    const w = weightsFor(t.id, st);
    const top = rankedExperts(w)[0];
    const y0 = m.top + i * rowH;
    svg.append(
      s(
        'text',
        { class: 'task-label', x: m.left - 12, y: y0 + rowH / 2 + 4, 'text-anchor': 'end' },
        t.id,
      ),
    );
    w.forEach((v, e) => {
      const { fill, ink } = heatColor(v);
      const rect = s('rect', {
        class: 'cell',
        x: m.left + e * cell + 1,
        y: y0 + 1,
        width: cell - 2,
        height: rowH - 2,
        rx: 6,
        tabindex: 0,
        role: 'button',
        'aria-label': `${t.id}, experto ${e}: ${formatDecimal(v, 2)}`,
        style: `fill: ${fill}${e === top ? '; stroke: var(--accent); stroke-width: 3' : ''}`,
      });
      bindTooltip(rect, () => ({
        title: `${t.id} · experto ${e}`,
        rows: [
          { label: st.mode === 'raw' ? 'Peso crudo' : 'Peso efectivo', value: formatDecimal(v, 3) },
          { label: 'Crudo (notebook)', value: formatDecimal(ROUTER_RAW[t.id][e] ?? 0, 2) },
        ],
      }));
      svg.append(
        rect,
        s(
          'text',
          {
            x: m.left + e * cell + cell / 2,
            y: y0 + rowH / 2 + 5,
            'text-anchor': 'middle',
            style: `fill: ${ink}; font-weight: 600; pointer-events: none; font-variant-numeric: tabular-nums`,
          },
          v === 0 ? '·' : formatDecimal(v, 2),
        ),
      );
    });
  });
  return svg;
}

/* ---------- Entropía por tarea ---------- */
function entropyChart(st: State): SVGSVGElement {
  const width = 420;
  const rowH = 56;
  const m = { top: 28, left: 112, right: 56, bottom: 30 };
  const height = m.top + TASKS.length * rowH + m.bottom;
  const x = linearScale([0, 1], [m.left, width - m.right]);
  const values = TASKS.map((t) => entropyFor(t.id, st));
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const svg = s('svg', {
    viewBox: `0 0 ${width} ${height}`,
    role: 'img',
    'aria-label': `Entropía normalizada por tarea; media ${formatDecimal(mean, 3)}.`,
  });
  for (const v of [0, 0.5, 1]) {
    svg.append(
      s('line', {
        class: v === 0 ? 'baseline' : 'grid',
        x1: x(v),
        x2: x(v),
        y1: m.top,
        y2: height - m.bottom,
      }),
      s('text', { x: x(v), y: height - 8, 'text-anchor': 'middle' }, formatDecimal(v, 1)),
    );
  }
  TASKS.forEach((t, i) => {
    const v = values[i] ?? 0;
    const cy = m.top + i * rowH + rowH / 2;
    const w = Math.max(0, x(v) - x(0));
    const r = Math.min(4, w);
    const y0 = cy - 11;
    const d = `M${x(0)},${y0} H${x(0) + w - r} Q${x(0) + w},${y0} ${x(0) + w},${y0 + r} V${y0 + 22 - r} Q${x(0) + w},${y0 + 22} ${x(0) + w - r},${y0 + 22} H${x(0)} Z`;
    svg.append(
      s('text', { class: 'task-label', x: m.left - 12, y: cy + 4, 'text-anchor': 'end' }, t.id),
      s('path', { class: 'bar', d, style: 'fill: var(--accent)' }),
      s('text', { class: 'value-label', x: x(0) + w + 8, y: cy + 4 }, formatDecimal(v, 3)),
    );
  });
  svg.append(
    s('line', {
      x1: x(mean),
      x2: x(mean),
      y1: m.top - 4,
      y2: height - m.bottom,
      style: 'stroke: var(--text-primary); stroke-width: 1.5; stroke-dasharray: 4 3',
    }),
    s(
      'text',
      { class: 'axis-label', x: x(mean), y: m.top - 10, 'text-anchor': 'middle' },
      `media ${formatDecimal(mean, 2)}`,
    ),
  );
  return svg;
}

function insights(target: HTMLElement, st: State): void {
  const tops = TASKS.map((t) => ({ task: t.id, top: rankedExperts(weightsFor(t.id, st))[0] ?? 0 }));
  const polarityTops = new Set(tops.filter((x) => POLARITY.includes(x.task)).map((x) => x.top));
  const sharedExpert = polarityTops.size === 1 ? [...polarityTops][0] : null;
  const values = TASKS.map((t) => entropyFor(t.id, st));
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const minIdx = values.indexOf(Math.min(...values));
  const minTask = TASKS[minIdx]?.id ?? 'rating5';

  const items = [
    {
      value: formatDecimal(mean, st.mode === 'raw' ? 3 : 2),
      text:
        st.mode === 'raw'
          ? 'de entropía media con los pesos crudos (valor del notebook): parece una especialización débil.'
          : 'de entropía media con los pesos efectivos: la especialización es mucho más marcada que lo que sugiere el notebook.',
    },
    {
      value: sharedExpert === null ? 'Sin grupo' : `exp ${sharedExpert}`,
      text:
        sharedExpert === null
          ? 'Con estos valores las tres tareas de polaridad no comparten experto principal.'
          : 'es el experto principal de las tres tareas de polaridad (sentiment, rating5, amazon_sent). Topic y length usan otros.',
    },
    {
      value: minTask,
      text:
        minTask === 'rating5'
          ? 'es la tarea con el enrutador más concentrado, y también donde separar parámetros más mejora frente al compartido.'
          : 'es la tarea con el enrutador más concentrado con estos valores de τ y k.',
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

export function initRouter(): void {
  const st: State = { mode: 'effective', tau: SETUP.gateTemperature, topK: SETUP.gateTopK };
  const tauIn = byIdAs('ctl-tau', HTMLInputElement);
  const kIn = byIdAs('ctl-topk', HTMLInputElement);
  const modeGroup = byId('router-mode');

  const render = (): void => {
    byId('out-tau').textContent = formatDecimal(st.tau, 1);
    byId('out-topk').textContent = String(st.topK);
    tauIn.disabled = st.mode === 'raw';
    kIn.disabled = st.mode === 'raw';
    byId('heatmap').replaceChildren(heatmap(st));
    byId('entropy-chart').replaceChildren(entropyChart(st));
    insights(byId('router-insights'), st);
  };

  wireRadioGroup(modeGroup, (btn) => {
    st.mode = btn.dataset.mode === 'raw' ? 'raw' : 'effective';
    render();
  });
  tauIn.addEventListener('input', () => {
    st.tau = Number(tauIn.value);
    render();
  });
  kIn.addEventListener('input', () => {
    st.topK = Number(kIn.value);
    render();
  });
  byId('router-reset').addEventListener('click', () => {
    st.tau = SETUP.gateTemperature;
    st.topK = SETUP.gateTopK;
    tauIn.value = String(st.tau);
    kIn.value = String(st.topK);
    const effective = modeGroup.querySelector<HTMLButtonElement>('[data-mode="effective"]');
    effective?.click();
    render();
  });
  // El mapa lee los colores del tema: se vuelve a dibujar cuando el tema cambia.
  document.addEventListener('themechange', render);
  render();
}
