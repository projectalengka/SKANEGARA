// Shared by the menu and image viewer. Reference counting also makes overlapping
// overlays safe: closing one must not unlock the other or lose the original offset.
let count = 0;
let restore: (() => void) | undefined;

export function lockPageScroll(): () => void {
  if (count === 0) {
    const offset = window.scrollY;
    const body = document.body;
    const previous = { position: body.style.position, top: body.style.top, width: body.style.width };
    const previousFlag = body.getAttribute('data-scroll-locked');
    body.setAttribute('data-scroll-locked', 'true');
    document.dispatchEvent(new Event('site:scroll-lock'));
    body.style.position = 'fixed';
    body.style.top = `-${offset}px`;
    body.style.width = '100%';
    restore = () => {
      Object.assign(body.style, previous);
      if (previousFlag === null) body.removeAttribute('data-scroll-locked');
      else body.setAttribute('data-scroll-locked', previousFlag);
      window.scrollTo({ top: offset, behavior: 'instant' });
      document.dispatchEvent(new Event('site:scroll-unlock'));
    };
  }
  count += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    count -= 1;
    if (count === 0) {
      restore?.();
      restore = undefined;
    }
  };
}
