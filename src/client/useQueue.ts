import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import type { QueueItem } from '../shared';

export type QueueState = {
  items: QueueItem[];
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

  const load = useCallback(
    async (after?: string | null) => {
      setState((current) => ({ ...current, isLoading: true }));
      try {
        const response = await api.queue(after);
        setState((current) => ({
          ...current,
          items: after ? [...current.items, ...response.items] : response.items,
          after: response.after,
          focusedIndex: current.items.length ? current.focusedIndex : 0,
          isLoading: false,
        }));
      } catch (error) {
        addToast(error instanceof Error ? error.message : 'Could not load queue', 'error');
        setState((current) => ({ ...current, isLoading: false }));
      }
    },
    [addToast],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (state.after && state.items.length - state.focusedIndex <= 5 && !state.isLoading) {
      void load(state.after);
    }
  }, [load, state.after, state.focusedIndex, state.isLoading, state.items.length]);

  const focused = state.items[state.focusedIndex] ?? null;

  const targetIds = useMemo(() => {
    if (state.selectedIds.size > 0) return [...state.selectedIds];
    return focused ? [focused.id] : [];
  }, [focused, state.selectedIds]);

  const moveFocus = useCallback((direction: 1 | -1) => {
    setState((current) => ({
      ...current,
      focusedIndex: Math.max(0, Math.min(current.items.length - 1, current.focusedIndex + direction)),
    }));
  }, []);

  const focusIndex = useCallback((index: number) => {
    setState((current) => ({
      ...current,
      focusedIndex: Math.max(0, Math.min(current.items.length - 1, index)),
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
      const item = current.items[current.focusedIndex];
      if (!item) return current;
      const selectedIds = new Set(current.selectedIds);
      if (selectedIds.has(item.id)) selectedIds.delete(item.id);
      else selectedIds.add(item.id);
      return { ...current, selectedIds };
    });
  }, []);

  const selectIds = useCallback((ids: string[]) => {
    if (ids.length < 2) return;
    setState((current) => {
      const selectedIds = new Set(current.selectedIds);
      ids.forEach((id) => selectedIds.add(id));
      return { ...current, selectedIds };
    });
  }, []);

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
      const [start, end] = [current.dragStartIndex, index].sort((a, b) => a - b);
      const dragPreviewIds = new Set<string>();
      current.items.slice(start, end + 1).forEach((item) => dragPreviewIds.add(item.id));
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
      return {
        ...current,
        items: nextItems,
        selectedIds: new Set([...current.selectedIds].filter((id) => !ids.includes(id))),
        dragPreviewIds: new Set([...current.dragPreviewIds].filter((id) => !ids.includes(id))),
        focusedIndex: Math.min(current.focusedIndex, Math.max(0, nextItems.length - 1)),
      };
    });
  }, []);

  const markRemoved = useCallback(
    (ids: string[], batchId: string) => {
      setState((current) => {
        const nextItems = current.items.filter((item) => !ids.includes(item.id));
        return {
          ...current,
          items: nextItems,
          selectedIds: new Set([...current.selectedIds].filter((id) => !ids.includes(id))),
          dragPreviewIds: new Set([...current.dragPreviewIds].filter((id) => !ids.includes(id))),
          lastBatchId: batchId,
          undoCountdown: 10,
          focusedIndex: Math.min(current.focusedIndex, Math.max(0, nextItems.length - 1)),
        };
      });
    },
    [],
  );

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

  return {
    state,
    focused,
    targetIds,
    load,
    moveFocus,
    focusIndex,
    toggleSelected,
    toggleFocused,
    selectIds,
    startDrag,
    updateDrag,
    endDrag,
    markRemoved,
    markApproved,
    patchItem,
    clearUndo,
  };
}
