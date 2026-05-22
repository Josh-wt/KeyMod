import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';

export function isMousePointer(event: ReactPointerEvent | ReactMouseEvent) {
  return !('pointerType' in event) || event.pointerType === 'mouse';
}

export function isCoarsePointer() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(pointer: coarse)').matches;
}
