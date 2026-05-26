import type { QueueItem } from '../shared';

/** Walk `parentId` links within the visible list (newest-first queue order). */
export function resolveAncestorComments(item: QueueItem, visibleItems: QueueItem[]): QueueItem[] {
  if (item.contextComments?.length) return item.contextComments;

  const byId = new Map(visibleItems.map((entry) => [entry.id, entry]));
  const chain: QueueItem[] = [];
  const seen = new Set<string>([item.id]);
  let parentId = item.parentId;

  while (parentId?.startsWith('t1_')) {
    if (seen.has(parentId)) break;
    seen.add(parentId);
    const parent = byId.get(parentId);
    if (!parent) break;
    chain.unshift(parent);
    parentId = parent.parentId;
  }

  return chain;
}

export function parentCommentDirectlyAbove(item: QueueItem, previousItem?: QueueItem): boolean {
  return Boolean(
    item.type === 'comment' &&
      item.parentId?.startsWith('t1_') &&
      previousItem?.type === 'comment' &&
      previousItem.id === item.parentId,
  );
}

export function childCommentDirectlyBelow(item: QueueItem, nextItem?: QueueItem): boolean {
  return Boolean(
    item.type === 'comment' &&
      nextItem?.type === 'comment' &&
      nextItem.parentId === item.id,
  );
}

/** Depth in a comment→comment chain (1 = reply to comment, 2 = reply to reply, …). */
export function commentChainDepth(item: QueueItem, visibleItems: QueueItem[]): number {
  if (item.type !== 'comment' || !item.parentId?.startsWith('t1_')) return 0;

  const byId = new Map(visibleItems.map((entry) => [entry.id, entry]));
  let depth = 0;
  let parentId: string | undefined = item.parentId;
  const seen = new Set<string>([item.id]);

  while (parentId?.startsWith('t1_')) {
    if (seen.has(parentId)) break;
    seen.add(parentId);
    depth += 1;
    parentId = byId.get(parentId)?.parentId;
  }

  return depth;
}

export function embeddedParentCommentIds(visibleItems: QueueItem[]): Set<string> {
  const ids = new Set<string>();
  for (const item of visibleItems) {
    if (item.type !== 'comment' || !item.parentId?.startsWith('t1_')) continue;
    const parentIndex = visibleItems.findIndex((entry) => entry.id === item.parentId);
    const itemIndex = visibleItems.findIndex((entry) => entry.id === item.id);
    if (parentIndex < 0 || itemIndex < 0) continue;
    if (parentIndex > itemIndex) ids.add(item.parentId);
  }
  return ids;
}
