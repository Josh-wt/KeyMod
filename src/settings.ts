import type { AppSettings, KeyAction, Keymap, RemovalReason } from './shared';

export const DEFAULT_KEYMAP: Keymap = {
  approve: 's',
  ban: 'b',
  lock: 'l',
  flair: 'f',
  note: 'm',
  user: 'u',
  next: 'j',
  prev: 'k',
  select: ' ',
  undo: 'Backspace',
  help: '?',
};

export const KEY_SETTING_BY_ACTION: Record<KeyAction, string> = {
  approve: 'key_approve',
  ban: 'key_ban',
  lock: 'key_lock',
  flair: 'key_flair',
  note: 'key_note',
  user: 'key_user',
  next: 'key_next',
  prev: 'key_prev',
  select: 'key_select',
  undo: 'key_undo',
  help: 'key_help',
};

export const settingDefinitions = [
  ...Array.from({ length: 9 }, (_, i) => ({
    name: `removal_reason_${i + 1}`,
    label: `Removal reason ${i + 1}`,
    type: 'string',
    scope: 'installation',
    defaultValue: '',
  })),
  ...Array.from({ length: 9 }, (_, i) => ({
    name: `removal_reason_flair_${i + 1}`,
    label: `Removal reason ${i + 1} flair ID`,
    type: 'string',
    scope: 'installation',
    defaultValue: '',
  })),
  ...Object.entries(KEY_SETTING_BY_ACTION).map(([action, name]) => ({
    name,
    label: `Key binding: ${action}`,
    type: 'string',
    scope: 'installation',
    defaultValue: DEFAULT_KEYMAP[action as KeyAction],
  })),
] as const;

export function normalizeKey(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || value.length === 0) return fallback;
  if (value === 'Space' || value === 'space') return ' ';
  if (value.length === 1 || value === 'Backspace' || value === 'Escape' || value === 'Enter') return value;
  return fallback;
}

export function detectKeyConflicts(keymap: Keymap): Array<{ key: string; actions: string[] }> {
  const seen = new Map<string, string>();
  const conflicts: Array<{ key: string; actions: string[] }> = [];

  for (const [action, key] of Object.entries(keymap)) {
    if (seen.has(key)) {
      conflicts.push({ key, actions: [seen.get(key)!, action] });
    }
    seen.set(key, action);
  }

  return conflicts;
}

export async function resolveSettings(settingsApi?: {
  get?: (name: string) => Promise<unknown>;
  getAll?: () => Promise<Record<string, unknown>>;
}): Promise<AppSettings> {
  const raw = settingsApi?.getAll ? await settingsApi.getAll() : {};
  const get = async (name: string): Promise<unknown> => {
    if (name in raw) return raw[name];
    return settingsApi?.get ? settingsApi.get(name) : undefined;
  };

  const keymap = {} as Keymap;
  for (const [action, settingName] of Object.entries(KEY_SETTING_BY_ACTION)) {
    const fallback = DEFAULT_KEYMAP[action as KeyAction];
    keymap[action as KeyAction] = normalizeKey(await get(settingName), fallback);
  }

  const removalReasons: RemovalReason[] = [];
  for (let index = 1; index <= 9; index += 1) {
    const text = await get(`removal_reason_${index}`);
    const flairId = await get(`removal_reason_flair_${index}`);
    removalReasons.push({
      index,
      text: typeof text === 'string' ? text : '',
      flairId: typeof flairId === 'string' ? flairId : '',
    });
  }

  return {
    keymap,
    removalReasons,
    conflicts: detectKeyConflicts(keymap),
  };
}
