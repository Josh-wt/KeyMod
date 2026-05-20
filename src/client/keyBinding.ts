import type { Keymap } from '../shared';

export function keyFromKeyboardEvent(event: KeyboardEvent): string {
  if (event.shiftKey && event.key.length === 1) {
    return `Shift+${event.key.toLowerCase()}`;
  }
  if (event.key === ' ') return ' ';
  return event.key;
}

export function actionForKey(keymap: Keymap, event: KeyboardEvent): string | undefined {
  const pressed = keyFromKeyboardEvent(event);
  for (const [action, key] of Object.entries(keymap)) {
    if (key === pressed) return action;
  }
  return undefined;
}
