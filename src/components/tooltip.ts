import { byId, h } from '../lib/dom';

export interface TooltipRow {
  readonly color?: string;
  readonly label: string;
  readonly value: string;
}

let tip: HTMLElement | null = null;

function el(): HTMLElement {
  tip ??= byId('tooltip');
  return tip;
}

/** Muestra el tooltip junto al puntero o, con teclado, junto al elemento enfocado. */
export function showTooltip(
  anchor: { clientX: number; clientY: number },
  title: string,
  rows: readonly TooltipRow[],
): void {
  const t = el();
  t.replaceChildren(
    h('div', { class: 'tooltip__title' }, title),
    ...rows.map((r) =>
      h(
        'div',
        { class: 'tooltip__row' },
        r.color ? h('i', { class: 'swatch', style: `--series-color:${r.color}` }) : null,
        h('span', {}, r.label),
        h('span', {}, r.value),
      ),
    ),
  );
  t.hidden = false;
  const pad = 14;
  const { width, height } = t.getBoundingClientRect();
  let x = anchor.clientX + pad;
  let y = anchor.clientY + pad;
  if (x + width > window.innerWidth - 8) x = anchor.clientX - width - pad;
  if (y + height > window.innerHeight - 8) y = anchor.clientY - height - pad;
  t.style.left = `${Math.max(8, x)}px`;
  t.style.top = `${Math.max(8, y)}px`;
}

export function hideTooltip(): void {
  el().hidden = true;
}

/** Centro de un elemento, para posicionar el tooltip cuando llega el foco por teclado. */
export function centerOf(target: Element): { clientX: number; clientY: number } {
  const r = target.getBoundingClientRect();
  return { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
}

/** Conecta hover, foco y salida de un elemento SVG a un contenido de tooltip. */
export function bindTooltip(
  target: SVGElement | HTMLElement,
  content: () => { title: string; rows: readonly TooltipRow[] },
  onEnter?: () => void,
  onLeave?: () => void,
): void {
  target.addEventListener('pointermove', (e) => {
    if (!(e instanceof MouseEvent)) return;
    const c = content();
    showTooltip(e, c.title, c.rows);
  });
  target.addEventListener('pointerenter', () => onEnter?.());
  target.addEventListener('focus', () => {
    const c = content();
    showTooltip(centerOf(target), c.title, c.rows);
    onEnter?.();
  });
  const leave = (): void => {
    hideTooltip();
    onLeave?.();
  };
  target.addEventListener('pointerleave', leave);
  target.addEventListener('blur', leave);
}
