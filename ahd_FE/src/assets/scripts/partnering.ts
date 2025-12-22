(() => {
  const scripts = document.querySelectorAll<HTMLScriptElement>('script[src*="partnering.ts"]');
  const scriptEl = scripts[scripts.length - 1] ?? null;
  const root = (scriptEl?.previousElementSibling as HTMLElement | null) ?? null;
  if (!root) return;

  const scroller = root.querySelector<HTMLElement>('[data-scroller]');
  const prev = root.querySelector<HTMLButtonElement>('[data-prev]');
  const next = root.querySelector<HTMLButtonElement>('[data-next]');
  if (!scroller || !prev || !next) return;

  const getItemWidth = (): number => {
    const firstItem = scroller.querySelector<HTMLElement>('[data-item]');
    if (!firstItem) return 0;
    const styles = getComputedStyle(firstItem);
    const margin = parseFloat(styles.marginLeft) + parseFloat(styles.marginRight);
    return firstItem.getBoundingClientRect().width + margin;
  };

  const updateButtons = (): void => {
    const max = scroller.scrollWidth - scroller.clientWidth;
    const atStart = scroller.scrollLeft <= 1;
    const atEnd = scroller.scrollLeft >= max - 1 || max <= 0;
    prev.toggleAttribute('hidden', atStart);
    next.toggleAttribute('hidden', atEnd);
    prev.toggleAttribute('aria-disabled', atStart);
    next.toggleAttribute('aria-disabled', atEnd);
  };

  const scrollByItem = (direction: number): void => {
    const delta = getItemWidth();
    if (!delta) return;
    scroller.scrollBy({ left: direction * delta, behavior: 'smooth' });
    requestAnimationFrame(updateButtons);
  };

  prev.addEventListener('click', () => scrollByItem(-1));
  next.addEventListener('click', () => scrollByItem(1));

  scroller.addEventListener('scroll', () => updateButtons());
  window.addEventListener('resize', () => updateButtons());

  if (document.readyState === 'complete') {
    updateButtons();
  } else {
    window.addEventListener('load', updateButtons, { once: true });
  }
})();
