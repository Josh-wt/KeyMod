import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { filterQueueItems, queuePostKindStats, queueStats } from './queueFilter';
import type { QueueFilter, QueueItem, QueuePostKindFilter } from '../shared';

function visibleQueueItems(items: QueueItem[], filter: QueueFilter, postKindFilter: QueuePostKindFilter) {
  return filterQueueItems(items, filter, postKindFilter);
}

export type QueueState = {
  items: QueueItem[];
  filter: QueueFilter;
  postKindFilter: QueuePostKindFilter;
  focusedIndex: number;
  selectedIds: Set<string>;
  isDragging: boolean;
  dragStartIndex: number | null;
  dragPreviewIds: Set<string>;
  lastBatchId: string | null;
  undoCountdown: number | null;
  after: string | null;
  isLoading: boolean;
};

export function useQueue(addToast: (message: string, kind?: 'info' | 'warning' | 'error' | 'success') => void) {
  const [state, setState] = useState<QueueState>({
    items: [],
    filter: 'all',
    postKindFilter: 'all',
    focusedIndex: 0,
    selectedIds: new Set(),
    isDragging: false,
    dragStartIndex: null,
    dragPreviewIds: new Set(),
    lastBatchId: null,
    undoCountdown: null,
    after: null,
    isLoading: true,
  });

  const visibleItems = useMemo(
    () => visibleQueueItems(state.items, state.filter, state.postKindFilter),
    [state.filter, state.items, state.postKindFilter],
  );
  const stats = useMemo(() => queueStats(state.items), [state.items]);
  const postKindStats = useMemo(() => queuePostKindStats(state.items), [state.items]);

  const load = useCallback(
    async (after?: string | null) => {
      setState((current) => ({ ...current, isLoading: true }));
      try {
        const response = await api.queue(after);
        setState((current) => ({
          ...current,
          items: after ? [...current.items, ...response.items] : response.items,
          after: response.after,
          focusedIndex: after ? current.focusedIndex : 0,
          isLoading: false,
        }));
      } catch (error) {
        addToast(error instanceof Error ? error.message : 'Could not load queue', 'error');
        setState((current) => ({ ...current, isLoading: false }));
      }
    },
    [addToast],
  );

  const refresh = useCallback(() => {
    void load(null);
  }, [load]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (state.after && state.items.length - state.focusedIndex <= 5 && !state.isLoading) {
      void load(state.after);
    }
  }, [load, state.after, state.focusedIndex, state.isLoading, state.items.length]);

  useEffect(() => {
    if (state.undoCountdown === null) return;
    const timer = window.setInterval(() => {
      setState((current) => {
        if (current.undoCountdown === null) return current;
        if (current.undoCountdown <= 1) return { ...current, undoCountdown: null, lastBatchId: null };
        return { ...current, undoCountdown: current.undoCountdown - 1 };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [state.undoCountdown]);

  const focused = visibleItems[state.focusedIndex] ?? null;

  const targetIds = useMemo(() => {
    if (state.selectedIds.size > 0) {
      return visibleItems.filter((item) => state.selectedIds.has(item.id)).map((item) => item.id);
    }
    return focused ? [focused.id] : [];
  }, [focused, state.selectedIds, visibleItems]);

  const clampFocus = (index: number, length: number) => Math.max(0, Math.min(Math.max(0, length - 1), index));

  const moveFocus = useCallback((direction: 1 | -1) => {
    setState((current) => {
      const items = visibleQueueItems(current.items, current.filter, current.postKindFilter);
      return {
        ...current,
        focusedIndex: clampFocus(current.focusedIndex + direction, items.length),
      };
    });
  }, []);

  const focusIndex = useCallback((index: number) => {
    setState((current) => {
      const items = visibleQueueItems(current.items, current.filter, current.postKindFilter);
      return { ...current, focusedIndex: clampFocus(index, items.length) };
    });
  }, []);

  const clearHover = useCallback(() => {
    setState((current) => ({ ...current, focusedIndex: -1 }));
  }, []);

  const setFilter = useCallback((filter: QueueFilter) => {
    setState((current) => ({
      ...current,
      filter,
      postKindFilter: filter === 'comments' ? 'all' : current.postKindFilter,
      focusedIndex: 0,
    }));
  }, []);

  const setPostKindFilter = useCallback((postKindFilter: QueuePostKindFilter) => {
    setState((current) => ({
      ...current,
      postKindFilter,
      filter: postKindFilter === 'all' ? current.filter : current.filter === 'comments' ? 'posts' : current.filter,
      focusedIndex: 0,
    }));
  }, []);

  const toggleSelected = useCallback((id: string) => {
    setState((current) => {
      const selectedIds = new Set(current.selectedIds);
      if (selectedIds.has(id)) selectedIds.delete(id);
      else selectedIds.add(id);
      return { ...current, selectedIds };
    });
  }, []);

  const toggleFocused = useCallback(() => {
    setState((current) => {
      const item = visibleQueueItems(current.items, current.filter, current.postKindFilter)[current.focusedIndex];
      if (!item) return current;
      const selectedIds = new Set(current.selectedIds);
      if (selectedIds.has(item.id)) selectedIds.delete(item.id);
      else selectedIds.add(item.id);
      return { ...current, selectedIds };
    });
  }, []);

  const selectAllVisible = useCallback(() => {
    setState((current) => {
      const selectedIds = new Set(current.selectedIds);
      visibleQueueItems(current.items, current.filter, current.postKindFilter).forEach((item) => selectedIds.add(item.id));
      return { ...current, selectedIds };
    });
  }, []);

  const clearSelection = useCallback(() => {
    setState((current) => ({ ...current, selectedIds: new Set(), dragPreviewIds: new Set() }));
  }, []);

  const addSelected = useCallback((ids: string[]) => {
    if (!ids.length) return;
    setState((current) => {
      const selectedIds = new Set(current.selectedIds);
      ids.forEach((id) => selectedIds.add(id));
      return { ...current, selectedIds };
    });
  }, []);

  const selectIds = useCallback(
    (ids: string[]) => {
      if (ids.length < 2) return;
      addSelected(ids);
    },
    [addSelected],
  );

  const startDrag = useCallback((index: number) => {
    setState((current) => ({
      ...current,
      isDragging: true,
      dragStartIndex: index,
      dragPreviewIds: new Set(),
      focusedIndex: index,
    }));
  }, []);

  const updateDrag = useCallback((index: number) => {
    setState((current) => {
      if (!current.isDragging || current.dragStartIndex === null) return current;
      if (index === current.dragStartIndex) return current;
      const items = visibleQueueItems(current.items, current.filter, current.postKindFilter);
      const [start, end] = [current.dragStartIndex, index].sort((a, b) => a - b);
      const dragPreviewIds = new Set<string>();
      items.slice(start, end + 1).forEach((item) => dragPreviewIds.add(item.id));
      return { ...current, dragPreviewIds, focusedIndex: index };
    });
  }, []);

  const endDrag = useCallback(() => {
    setState((current) => {
      if (current.dragPreviewIds.size < 2) {
        return { ...current, isDragging: false, dragStartIndex: null, dragPreviewIds: new Set() };
      }
      const selectedIds = new Set(current.selectedIds);
      current.dragPreviewIds.forEach((id) => selectedIds.add(id));
      return { ...current, selectedIds, isDragging: false, dragStartIndex: null, dragPreviewIds: new Set() };
    });
  }, []);

  const dismissIds = useCallback((ids: string[]) => {
    setState((current) => {
      const nextItems = current.items.filter((item) => !ids.includes(item.id));
      const items = visibleQueueItems(nextItems, current.filter, current.postKindFilter);
      return {
        ...current,
        items: nextItems,
        selectedIds: new Set([...current.selectedIds].filter((id) => !ids.includes(id))),
        dragPreviewIds: new Set([...current.dragPreviewIds].filter((id) => !ids.includes(id))),
        focusedIndex: clampFocus(current.focusedIndex, items.length),
      };
    });
  }, []);

  const markRemoved = useCallback((ids: string[], batchId: string) => {
    setState((current) => {
      const nextItems = current.items.filter((item) => !ids.includes(item.id));
      const items = visibleQueueItems(nextItems, current.filter, current.postKindFilter);
      return {
        ...current,
        items: nextItems,
        selectedIds: new Set([...current.selectedIds].filter((id) => !ids.includes(id))),
        dragPreviewIds: new Set([...current.dragPreviewIds].filter((id) => !ids.includes(id))),
        lastBatchId: batchId,
        undoCountdown: 10,
        focusedIndex: clampFocus(current.focusedIndex, items.length),
      };
    });
  }, []);

  const markApproved = useCallback(
    (ids: string[]) => {
      dismissIds(ids);
    },
    [dismissIds],
  );

  const patchItem = useCallback((id: string, patch: Partial<QueueItem>) => {
    setState((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  }, []);

  const clearUndo = useCallback(() => {
    setState((current) => ({ ...current, lastBatchId: null, undoCountdown: null }));
  }, []);

  const setRemovalBatchId = useCallback((batchId: string) => {
    setState((current) => ({ ...current, lastBatchId: batchId }));
  }, []);

  const restoreItems = useCallback((items: QueueItem[]) => {
    if (!items.length) return;
    setState((current) => {
      const existing = new Set(current.items.map((item) => item.id));
      const restored = items
        .filter((item) => !existing.has(item.id))
        .map(({ locallyRemoved, lastRemovalReasonLabel, ...item }) => item);
      if (!restored.length) return { ...current, undoCountdown: null, lastBatchId: null };
      const merged = [...current.items, ...restored].sort((a, b) => b.createdAt - a.createdAt);
      const visible = visibleQueueItems(merged, current.filter, current.postKindFilter);
      return {
        ...current,
        items: merged,
        undoCountdown: null,
        lastBatchId: null,
        focusedIndex: clampFocus(current.focusedIndex, visible.length),
      };
    });
  }, []);

  return {
    state,
    visibleItems,
    stats,
    postKindStats,
    focused,
    targetIds,
    load,
    refresh,
    setFilter,
    setPostKindFilter,
    moveFocus,
    focusIndex,
    toggleSelected,
    toggleFocused,
    selectAllVisible,
    clearSelection,
    selectIds,
    addSelected,
    clearHover,
    startDrag,
    updateDrag,
    endDrag,
    markRemoved,
    markApproved,
    patchItem,
    clearUndo,
    setRemovalBatchId,
    restoreItems,
  };
}
