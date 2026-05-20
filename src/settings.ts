import type { AppSettings, BanReason, KeyAction, Keymap, RemovalReason } from './shared';

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

export async function resolveSettings(settingsApi: {
  getAll(): Promise<Record<string, unknown>>;
}): Promise<AppSettings> {
  const raw = await settingsApi.getAll();

  const keymap = {} as Keymap;
  for (const [action, settingName] of Object.entries(KEY_SETTING_BY_ACTION)) {
    keymap[action as KeyAction] = normalizeKey(raw[settingName], DEFAULT_KEYMAP[action as KeyAction]);
  }

  const removalReasons: RemovalReason[] = [];
  const banReasons: BanReason[] = [];
  for (let index = 1; index <= 9; index += 1) {
    const text = raw[`removal_reason_${index}`];
    const flairId = raw[`removal_reason_flair_${index}`];
    removalReasons.push({
      index,
      text: typeof text === 'string' ? text : '',
      flairId: typeof flairId === 'string' ? flairId : '',
    });

    const reason = raw[`ban_reason_${index}`];
    const message = raw[`ban_message_${index}`];
    const note = raw[`ban_note_${index}`];
    const duration = raw[`ban_duration_${index}`];
    banReasons.push({
      index,
      reason: typeof reason === 'string' ? reason : '',
      message: typeof message === 'string' ? message : '',
      note: typeof note === 'string' ? note : '',
      duration: typeof duration === 'number' && Number.isFinite(duration) ? Math.max(0, Math.min(999, duration)) : 0,
    });
  }

  return {
    keymap,
    removalReasons,
    banReasons,
    conflicts: detectKeyConflicts(keymap),
  };
}
