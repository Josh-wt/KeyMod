import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api';
import type { FeedSort, QueueItem } from '../shared';

export type FeedListState = {
  items: QueueItem[];
  comments: QueueItem[];
  activePost: QueueItem | null;
  sort: FeedSort;
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

function clampFocus(index: number, length: number) {
  return Math.max(0, Math.min(Math.max(0, length - 1), index));
}

export function useFeedList(addToast: (message: string, kind?: 'info' | 'warning' | 'error' | 'success') => void) {
  const requestVersion = useRef(0);
  const threadFocusId = useRef<string | null>(null);
  const threadLink = useRef<string | null>(null);
  const [state, setState] = useState<FeedListState>({
    items: [],
    comments: [],
    activePost: null,
    sort: 'hot',
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
    () => (state.activePost ? [state.activePost, ...state.comments] : state.items),
    [state.activePost, state.comments, state.items],
  );

  const load = useCallback(
    async (sort: FeedSort, after?: string | null) => {
      const version = ++requestVersion.current;
      setState((current) => ({ ...current, isLoading: true, ...(after ? {} : { sort }) }));
      try {
        const response = await api.feed(sort, after);
        if (version !== requestVersion.current) return;
        if (!after) threadLink.current = null;
        setState((current) => ({
          ...current,
          sort,
          items: after ? [...current.items, ...response.items] : response.items,
          comments: after ? current.comments : [],
          activePost: after ? current.activePost : null,
          after: response.after,
          focusedIndex: after ? current.focusedIndex : 0,
          isLoading: false,
        }));
      } catch (error) {
        if (version !== requestVersion.current) return;
        addToast(error instanceof Error ? error.message : 'Could not load feed', 'error');
        setState((current) => ({ ...current, isLoading: false }));
      }
    },
    [addToast],
  );

  const refreshFeed = useCallback(() => {
    void load(state.sort, null);
  }, [load, state.sort]);

  useEffect(() => {
    void load('hot', null);
  }, [load]);

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

  const moveFocus = useCallback((direction: 1 | -1) => {
    setState((current) => {
      const items = current.activePost ? [current.activePost, ...current.comments] : current.items;
      return {
        ...current,
        focusedIndex: clampFocus(current.focusedIndex + direction, items.length),
      };
    });
  }, []);

  const focusIndex = useCallback((index: number) => {
    setState((current) => {
      const items = current.activePost ? [current.activePost, ...current.comments] : current.items;
      return {
        ...current,
        focusedIndex: clampFocus(index, items.length),
      };
    });
  }, []);

  const clearHover = useCallback(() => {
    setState((current) => ({ ...current, focusedIndex: -1 }));
  }, []);

  const setSort = useCallback(
    (sort: FeedSort) => {
      setState((current) => ({
        ...current,
        sort,
        items: [],
        comments: [],
        activePost: null,
        after: null,
        focusedIndex: 0,
        selectedIds: new Set(),
        dragPreviewIds: new Set(),
      }));
      void load(sort, null);
    },
    [load],
  );

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
      const items = current.activePost ? [current.activePost, ...current.comments] : current.items;
      const item = items[current.focusedIndex];
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
      const items = current.activePost ? [current.activePost, ...current.comments] : current.items;
      items.forEach((item) => selectedIds.add(item.id));
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
      const [start, end] = [current.dragStartIndex, index].sort((a, b) => a - b);
      const dragPreviewIds = new Set<string>();
      const items = current.activePost ? [current.activePost, ...current.comments] : current.items;
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
      const nextComments = current.comments.filter((item) => !ids.includes(item.id));
      const nextActivePost = current.activePost && ids.includes(current.activePost.id) ? null : current.activePost;
      const visible = nextActivePost ? [nextActivePost, ...nextComments] : nextItems;
      return {
        ...current,
        items: nextItems,
        comments: nextComments,
        activePost: nextActivePost,
        selectedIds: new Set([...current.selectedIds].filter((id) => !ids.includes(id))),
        dragPreviewIds: new Set([...current.dragPreviewIds].filter((id) => !ids.includes(id))),
        focusedIndex: clampFocus(current.focusedIndex, visible.length),
      };
    });
  }, []);

  const markRemoved = useCallback((ids: string[], batchId: string) => {
    setState((current) => {
      const activePost = current.activePost;
      if (activePost) {
        const mark = (item: QueueItem) =>
          ids.includes(item.id) ? { ...item, locallyRemoved: true, lastRemovalReasonLabel: 'Removed' } : item;
        return {
          ...current,
          items: current.items.map(mark),
          comments: current.comments.map(mark),
          activePost: mark(activePost),
          selectedIds: new Set([...current.selectedIds].filter((id) => !ids.includes(id))),
          dragPreviewIds: new Set([...current.dragPreviewIds].filter((id) => !ids.includes(id))),
          lastBatchId: batchId,
          undoCountdown: 10,
        };
      }
      const nextItems = current.items.filter((item) => !ids.includes(item.id));
      const nextComments = current.comments.filter((item) => !ids.includes(item.id));
      const nextActivePost = current.activePost && ids.includes(current.activePost.id) ? null : current.activePost;
      const visible = nextActivePost ? [nextActivePost, ...nextComments] : nextItems;
      return {
        ...current,
        items: nextItems,
        comments: nextComments,
        activePost: nextActivePost,
        selectedIds: new Set([...current.selectedIds].filter((id) => !ids.includes(id))),
        dragPreviewIds: new Set([...current.dragPreviewIds].filter((id) => !ids.includes(id))),
        lastBatchId: batchId,
        undoCountdown: 10,
        focusedIndex: clampFocus(current.focusedIndex, visible.length),
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
      comments: current.comments.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      activePost: current.activePost?.id === id ? { ...current.activePost, ...patch } : current.activePost,
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
      const restoreIds = new Set(items.map((item) => item.id));
      const clearLocalRemoval = (item: QueueItem) => {
        if (!restoreIds.has(item.id)) return item;
        const { locallyRemoved, lastRemovalReasonLabel, ...restored } = item;
        return restored;
      };
      const existing = new Set([
        ...current.items,
        ...current.comments,
        ...(current.activePost ? [current.activePost] : []),
      ].map((item) => item.id));
      const restored = items
        .filter((item) => !existing.has(item.id))
        .map(({ locallyRemoved, lastRemovalReasonLabel, ...item }) => item);
      const itemsWithClearedRemoval = current.items.map(clearLocalRemoval);
      const commentsWithClearedRemoval = current.comments.map(clearLocalRemoval);
      const activePostWithClearedRemoval = current.activePost ? clearLocalRemoval(current.activePost) : null;
      if (!restored.length) {
        return {
          ...current,
          items: itemsWithClearedRemoval,
          comments: commentsWithClearedRemoval,
          activePost: activePostWithClearedRemoval,
          undoCountdown: null,
          lastBatchId: null,
        };
      }
      const restoredComments = current.activePost ? restored.filter((item) => item.type === 'comment') : [];
      const restoredItems = restored.filter((item) => !restoredComments.includes(item));
      const mergedItems = [...itemsWithClearedRemoval, ...restoredItems].sort((a, b) => b.createdAt - a.createdAt);
      const mergedComments = [...commentsWithClearedRemoval, ...restoredComments].sort((a, b) => b.createdAt - a.createdAt);
      const visible = activePostWithClearedRemoval ? [activePostWithClearedRemoval, ...mergedComments] : mergedItems;
      return {
        ...current,
        items: mergedItems,
        comments: mergedComments,
        activePost: activePostWithClearedRemoval,
        undoCountdown: null,
        lastBatchId: null,
        focusedIndex: clampFocus(current.focusedIndex, visible.length),
      };
    });
  }, []);

  const loadMore = useCallback(() => {
    if (state.activePost || !state.after || state.isLoading) return;
    void load(state.sort, state.after);
  }, [load, state.activePost, state.after, state.isLoading, state.sort]);

  const openPost = useCallback(
    async (post: QueueItem) => {
      const version = ++requestVersion.current;
      threadLink.current = null;
      setState((current) => ({
        ...current,
        activePost: post,
        comments: [],
        focusedIndex: 0,
        selectedIds: new Set(),
        dragPreviewIds: new Set(),
        isLoading: true,
      }));
      try {
        const response = await api.feedComments(post.id);
        if (version !== requestVersion.current) return;
        setState((current) =>
          current.activePost?.id === post.id
            ? {
                ...current,
                comments: response.comments,
                focusedIndex: response.comments.length ? 1 : 0,
                isLoading: false,
              }
            : current,
        );
      } catch (error) {
        if (version !== requestVersion.current) return;
        addToast(error instanceof Error ? error.message : 'Could not load post comments', 'error');
        setState((current) => (current.activePost?.id === post.id ? { ...current, isLoading: false } : current));
      }
    },
    [addToast],
  );

  const openThread = useCallback(async (link: string) => {
    const version = ++requestVersion.current;
    setState((current) => ({ ...current, isLoading: true }));
    try {
      const response = await api.thread(link);
      if (version !== requestVersion.current) throw new Error('Thread navigation was cancelled. Please try again.');
      const items = [response.post, ...response.comments];
      threadFocusId.current = response.focusedId;
      threadLink.current = link;
      setState((current) => ({ ...current, activePost: response.post, comments: response.comments,
        focusedIndex: Math.max(0, items.findIndex((item) => item.id === response.focusedId)),
        selectedIds: new Set(), dragPreviewIds: new Set(), isDragging: false, dragStartIndex: null, isLoading: false }));
    } catch (error) {
      if (version === requestVersion.current) setState((current) => ({ ...current, isLoading: false }));
      throw error;
    }
  }, []);

  const closePost = useCallback(() => {
    requestVersion.current++;
    threadFocusId.current = null;
    threadLink.current = null;
    setState((current) => ({
      ...current,
      activePost: null,
      comments: [],
      focusedIndex: 0,
      selectedIds: new Set(),
      dragPreviewIds: new Set(),
      isLoading: false,
    }));
  }, []);

  const refresh = useCallback(() => {
    if (state.activePost && threadLink.current) {
      void openThread(threadLink.current).catch((error) =>
        addToast(error instanceof Error ? error.message : 'Could not refresh thread', 'error'));
      return;
    }
    if (state.activePost) {
      void openPost(state.activePost);
      return;
    }
    refreshFeed();
  }, [addToast, openPost, openThread, refreshFeed, state.activePost]);

  return {
    state,
    visibleItems,
    focused,
    targetIds,
    load,
    refresh,
    setSort,
    openPost,
    openThread,
    threadFocusId,
    closePost,
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
    loadMore,
  };
}
