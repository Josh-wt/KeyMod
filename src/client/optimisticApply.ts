import type { QueueItem } from '../shared';

export function applyModUpdates(
  updates: Array<{ id: string } & Partial<QueueItem>> | undefined,
  patchItem: (id: string, patch: Partial<QueueItem>) => void,
) {
  for (const update of updates ?? []) {
    const { id, ...patch } = update;
    if (Object.keys(patch).length) patchItem(id, patch);
  }
}
