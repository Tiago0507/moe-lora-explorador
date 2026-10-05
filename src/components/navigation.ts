/**
 * Navegación de presentación: resalta la sección visible, barra de progreso,
 * teclas 1 a 6 para saltar entre secciones y selector de tema claro/oscuro.
 */
import { byId, byIdAs, prefersReducedMotion } from '../lib/dom';

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

function initSectionSpy(): void {
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.sections-nav a'));
  const sections = links
    .map((a) => document.querySelector<HTMLElement>(a.hash))
    .filter((el): el is HTMLElement => el !== null);

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        for (const a of links)
          a.setAttribute('aria-current', String(a.hash === `#${entry.target.id}`));
      }
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );
  for (const sec of sections) observer.observe(sec);

  document.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || isTyping(e.target)) return;
    const link = links.find((a) => a.dataset.key === e.key);
    if (!link) return;
    e.preventDefault();
    document
      .querySelector(link.hash)
      ?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    history.replaceState(null, '', link.hash);
  });
}

function initProgress(): void {
  const bar = byId('progress-bar');
  let queued = false;
  const update = (): void => {
    queued = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );
  update();
}

function initTheme(): void {
  const button = byIdAs('theme-toggle', HTMLButtonElement);
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const current = (): 'light' | 'dark' => {
    const forced = document.documentElement.dataset.theme;
    if (forced === 'light' || forced === 'dark') return forced;
    return media.matches ? 'dark' : 'light';
  };
  const sync = (): void => {
    const next = current() === 'dark' ? 'claro' : 'oscuro';
    button.setAttribute('aria-label', `Cambiar a tema ${next}`);
    button.title = `Cambiar a tema ${next}`;
    document.dispatchEvent(new Event('themechange'));
  };
  button.addEventListener('click', () => {
    const next = current() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch {
      /* sin almacenamiento: el cambio dura solo esta visita */
    }
    sync();
  });
  media.addEventListener('change', sync);
  sync();
}

export function initNavigation(): void {
  initSectionSpy();
  initProgress();
  initTheme();
}
