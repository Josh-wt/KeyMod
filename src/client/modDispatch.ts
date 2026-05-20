import { api } from './api';
import type { ModActionResult } from './modActions';
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

export async function runLock(
  ids: string[],
  patchItem: (id: string, patch: Partial<QueueItem>) => void,
): Promise<ModActionResult> {
  const response = await api.lock(ids);
  applyModUpdates(response.updates, patchItem);
  return response;
}

export async function runNsfw(
  ids: string[],
  patchItem: (id: string, patch: Partial<QueueItem>) => void,
): Promise<ModActionResult> {
  const response = await api.nsfw(ids);
  applyModUpdates(response.updates, patchItem);
  return response;
}

export async function runSpoiler(
  ids: string[],
  patchItem: (id: string, patch: Partial<QueueItem>) => void,
): Promise<ModActionResult> {
  const response = await api.spoiler(ids);
  applyModUpdates(response.updates, patchItem);
  return response;
}

export async function runHighlight(
  ids: string[],
  patchItem: (id: string, patch: Partial<QueueItem>) => void,
): Promise<ModActionResult> {
  const response = await api.highlight(ids);
  applyModUpdates(response.updates, patchItem);
  return response;
}

export async function runDistinguish(
  ids: string[],
  patchItem: (id: string, patch: Partial<QueueItem>) => void,
): Promise<ModActionResult> {
  const response = await api.distinguish(ids);
  applyModUpdates(response.updates, patchItem);
  return response;
}

export async function runIgnoreReports(
  ids: string[],
  patchItem: (id: string, patch: Partial<QueueItem>) => void,
): Promise<ModActionResult> {
  const response = await api.ignoreReports(ids);
  applyModUpdates(response.updates, patchItem);
  return response;
}
