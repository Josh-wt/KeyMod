import type { Keymap } from '../shared';

export function keyFromKeyboardEvent(event: KeyboardEvent): string {
  if (event.shiftKey && event.key.length === 1) {
    return `Shift+${event.key.toLowerCase()}`;
  }
  if (event.key === ' ' || event.code === 'Space') return ' ';
  if (event.key === 'Backspace' || event.code === 'Backspace') return 'Backspace';
  return event.key;
}

export function isUndoKey(event: KeyboardEvent): boolean {
  return event.key === 'Backspace' || event.code === 'Backspace';
}

export function actionForKey(keymap: Keymap, event: KeyboardEvent): string | undefined {
  const pressed = keyFromKeyboardEvent(event);
  for (const [action, key] of Object.entries(keymap)) {
    if (key === pressed) return action;
  }
  return undefined;
}
