import type { QueueItem } from '../shared';

export type ItemLookup = (id: string) => QueueItem | undefined;

type FieldSnapshot<K extends keyof QueueItem> = { id: string; value: QueueItem[K] | undefined };

export function optimisticToggleField<K extends keyof QueueItem>(
  ids: string[],
  field: K,
  toggle: (current: QueueItem[K] | undefined) => QueueItem[K],
  lookup: ItemLookup,
  patchItem: (id: string, patch: Partial<QueueItem>) => void,
): FieldSnapshot<K>[] {
  const snapshots: FieldSnapshot<K>[] = ids.map((id) => ({ id, value: lookup(id)?.[field] }));
  for (const { id, value } of snapshots) {
    patchItem(id, { [field]: toggle(value) } as Partial<QueueItem>);
  }
  return snapshots;
}

export function revertToggleField<K extends keyof QueueItem>(
  snapshots: FieldSnapshot<K>[],
  field: K,
  patchItem: (id: string, patch: Partial<QueueItem>) => void,
) {
  for (const { id, value } of snapshots) {
    patchItem(id, { [field]: value } as Partial<QueueItem>);
  }
}
