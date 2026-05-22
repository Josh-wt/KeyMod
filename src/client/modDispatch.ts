import { api } from './api';
import { applyModUpdates } from './optimisticApply';
import type { ItemLookup } from './optimisticMod';
import { optimisticToggleField, revertToggleField } from './optimisticMod';
import type { ModActionResult } from './modActions';
import type { QueueItem } from '../shared';

export { applyModUpdates } from './optimisticApply';

async function runOptimisticModAction(
  ids: string[],
  field: keyof QueueItem,
  toggle: (current: QueueItem[keyof QueueItem] | undefined) => QueueItem[keyof QueueItem],
  request: () => Promise<ModActionResult>,
  lookup: ItemLookup,
  patchItem: (id: string, patch: Partial<QueueItem>) => void,
): Promise<ModActionResult> {
  const snapshots = optimisticToggleField(ids, field, toggle, lookup, patchItem);
  try {
    const response = await request();
    if (response.failed) {
      revertToggleField(snapshots, field, patchItem);
      return response;
    }
    applyModUpdates(response.updates, patchItem);
    return response;
  } catch (error) {
    revertToggleField(snapshots, field, patchItem);
    throw error;
  }
}

export async function runLock(
  ids: string[],
  patchItem: (id: string, patch: Partial<QueueItem>) => void,
  lookup: ItemLookup,
): Promise<ModActionResult> {
  return runOptimisticModAction(ids, 'locked', (value) => !value, () => api.lock(ids), lookup, patchItem);
}

export async function runNsfw(
  ids: string[],
  patchItem: (id: string, patch: Partial<QueueItem>) => void,
  lookup: ItemLookup,
): Promise<ModActionResult> {
  return runOptimisticModAction(ids, 'nsfw', (value) => !value, () => api.nsfw(ids), lookup, patchItem);
}

export async function runSpoiler(
  ids: string[],
  patchItem: (id: string, patch: Partial<QueueItem>) => void,
  lookup: ItemLookup,
): Promise<ModActionResult> {
  return runOptimisticModAction(ids, 'spoiler', (value) => !value, () => api.spoiler(ids), lookup, patchItem);
}

export async function runHighlight(
  ids: string[],
  patchItem: (id: string, patch: Partial<QueueItem>) => void,
  lookup: ItemLookup,
): Promise<ModActionResult> {
  return runOptimisticModAction(ids, 'stickied', (value) => !value, () => api.highlight(ids), lookup, patchItem);
}

export async function runDistinguish(
  ids: string[],
  patchItem: (id: string, patch: Partial<QueueItem>) => void,
  lookup: ItemLookup,
): Promise<ModActionResult> {
  return runOptimisticModAction(
    ids,
    'distinguished',
    (value) => !value,
    () => api.distinguish(ids),
    lookup,
    patchItem,
  );
}

export async function runIgnoreReports(
  ids: string[],
  patchItem: (id: string, patch: Partial<QueueItem>) => void,
  lookup: ItemLookup,
): Promise<ModActionResult> {
  return runOptimisticModAction(
    ids,
    'ignoringReports',
    (value) => !value,
    () => api.ignoreReports(ids),
    lookup,
    patchItem,
  );
}
