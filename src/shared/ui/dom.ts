/** Tiny DOM helpers — keep game code free of querySelector soup. */

export function qs<T extends HTMLElement = HTMLElement>(
  sel: string,
  root: ParentNode = document,
): T {
  const el = root.querySelector(sel);
  if (!el) throw new Error(`Missing element: ${sel}`);
  return el as T;
}

export function qsOptional<T extends HTMLElement = HTMLElement>(
  sel: string,
  root: ParentNode = document,
): T | null {
  return root.querySelector(sel) as T | null;
}

export function on<K extends keyof HTMLElementEventMap>(
  el: HTMLElement | Window | Document,
  type: K,
  handler: (ev: HTMLElementEventMap[K]) => void,
  opts?: AddEventListenerOptions,
): void {
  el.addEventListener(type, handler as EventListener, opts);
}

export function setHidden(el: HTMLElement | null, hidden: boolean): void {
  if (!el) return;
  el.hidden = hidden;
}
