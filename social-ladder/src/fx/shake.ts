/**
 * Short transform-only shake of one element (the play viewport), done with the
 * Web Animations API: no layout work, no lingering offset, and a new shake
 * cancels the previous one so rapid crits never stack up.
 */
const running = new WeakMap<Element, Animation>();

export function shake(el: Element | null, amplitude: number, ms: number) {
  if (!el || typeof (el as HTMLElement).animate !== 'function') return;
  running.get(el)?.cancel();
  const frames: Keyframe[] = [{ transform: 'translate(0, 0)' }];
  const steps = Math.max(3, Math.round(ms / 22));
  for (let i = 1; i < steps; i++) {
    const fall = 1 - i / steps;
    const a = amplitude * fall;
    const x = Math.round((i % 2 ? 1 : -1) * a * (0.6 + Math.random() * 0.4));
    const y = Math.round((Math.random() * 2 - 1) * a * 0.6);
    frames.push({ transform: `translate(${x}px, ${y}px)` });
  }
  frames.push({ transform: 'translate(0, 0)' });
  const anim = (el as HTMLElement).animate(frames, { duration: ms, easing: 'linear', fill: 'none' });
  running.set(el, anim);
  anim.onfinish = anim.oncancel = () => {
    if (running.get(el) === anim) running.delete(el);
  };
}
