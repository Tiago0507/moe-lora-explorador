/** Utilidades mínimas para crear nodos HTML y SVG con tipado. */
const SVG_NS = 'http://www.w3.org/2000/svg';

type Attrs = Record<string, string | number | boolean | undefined>;
type Child = Node | string | null | undefined | false;

function applyAttrs(el: Element, attrs: Attrs): void {
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    el.setAttribute(key, value === true ? '' : String(value));
  }
}

function append(el: Element, children: readonly Child[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child);
  }
}

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  applyAttrs(el, attrs);
  append(el, children);
  return el;
}

export function s<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: Child[]
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  applyAttrs(el, attrs);
  append(el, children);
  return el;
}

export function byId(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`No existe el elemento #${id}`);
  return el;
}

/** Como `byId`, pero comprueba en tiempo de ejecución el tipo del elemento. */
export function byIdAs<T extends HTMLElement>(id: string, type: new () => T): T {
  const el = byId(id);
  if (!(el instanceof type)) throw new TypeError(`#${id} no es un ${type.name}`);
  return el;
}

/** Variable CSS de color de cada configuración. */
export function seriesVar(config: 'shared' | 'perTask' | 'moe'): string {
  return {
    shared: 'var(--series-shared)',
    perTask: 'var(--series-pertask)',
    moe: 'var(--series-moe)',
  }[config];
}

/** Color de texto legible sobre el relleno de cada serie. */
export function onSeriesVar(config: 'shared' | 'perTask' | 'moe'): string {
  return {
    shared: 'var(--on-series-shared)',
    perTask: 'var(--on-series-pertask)',
    moe: 'var(--on-series-moe)',
  }[config];
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Grupo de botones con rol radio y navegación con flechas (patrón WAI-ARIA). */
export function wireRadioGroup(
  group: HTMLElement,
  onChange: (button: HTMLButtonElement) => void,
): void {
  const buttons = (): HTMLButtonElement[] =>
    Array.from(group.querySelectorAll<HTMLButtonElement>('[role="radio"]'));

  const select = (btn: HTMLButtonElement, focus: boolean): void => {
    for (const b of buttons()) {
      const on = b === btn;
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
    }
    if (focus) btn.focus();
    onChange(btn);
  };

  for (const b of buttons()) b.tabIndex = b.getAttribute('aria-checked') === 'true' ? 0 : -1;

  group.addEventListener('click', (e) => {
    const btn = (e.target as Element).closest<HTMLButtonElement>('[role="radio"]');
    if (btn && group.contains(btn)) select(btn, false);
  });

  group.addEventListener('keydown', (e) => {
    const list = buttons();
    const current = list.findIndex((b) => b.getAttribute('aria-checked') === 'true');
    const delta = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (delta === undefined) return;
    e.preventDefault();
    const next = list[(current + delta + list.length) % list.length];
    if (next) select(next, true);
  });
}
