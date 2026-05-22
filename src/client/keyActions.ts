import { api } from './api';
import {
  runDistinguish,
  runHighlight,
  runIgnoreReports,
  runLock,
  runNsfw,
  runSpoiler,
} from './modDispatch';
import { redditPermalinkUrl } from './permalink';
import type { KeyAction, QueueItem, RemovalReason } from '../shared';

type ToastFn = (message: string, kind?: 'info' | 'warning' | 'error' | 'success') => void;

type Deps = {
  targetIds: string[];
  focused: QueueItem | null;
  findItem: (id: string) => QueueItem | undefined;
  removalReasons: RemovalReason[];
  patchItem: (id: string, patch: Partial<QueueItem>) => void;
  markApproved: (ids: string[]) => void;
  removeIds: (ids: string[], reasonIndex: number, asSpam?: boolean) => void;
  moveFocus: (direction: 1 | -1) => void;
  toggleFocused: () => void;
  selectAllVisible: () => void;
  clearSelection: () => void;
  refresh: () => void;
  setShowHelp: (value: boolean | ((prev: boolean) => boolean)) => void;
  undo: () => Promise<void>;
  setUserPanel: (username: string | null) => void;
  openModalForItem: (item: QueueItem, modal: 'ban' | 'flair' | 'note') => void;
  addToast: ToastFn;
};

function defaultRemovalIndex(reasons: RemovalReason[]) {
  return reasons.find((reason) => reason.text.trim())?.index ?? 1;
}

export async function runKeyAction(action: KeyAction, deps: Deps): Promise<void> {
  const {
    targetIds,
    focused,
    findItem,
    removalReasons,
    patchItem,
    markApproved,
    removeIds,
    moveFocus,
    toggleFocused,
    selectAllVisible,
    clearSelection,
    refresh,
    setShowHelp,
    undo,
    setUserPanel,
    openModalForItem,
    addToast,
  } = deps;

  if (action === 'next') {
    moveFocus(1);
    return;
  }
  if (action === 'prev') {
    moveFocus(-1);
    return;
  }
  if (action === 'select') {
    toggleFocused();
    return;
  }
  if (action === 'selectAll') {
    selectAllVisible();
    addToast('Selected all visible items.', 'info');
    return;
  }
  if (action === 'help') {
    setShowHelp((value) => !value);
    return;
  }
  if (action === 'refresh') {
    refresh();
    addToast('Refreshing queue…', 'info');
    return;
  }
  if (action === 'undo') {
    await undo();
    return;
  }
  if (action === 'user' && focused) {
    setUserPanel(focused.author);
    return;
  }
  if (action === 'ban' && focused) {
    openModalForItem(focused, 'ban');
    return;
  }
  if (action === 'flair' && focused) {
    openModalForItem(focused, 'flair');
    return;
  }
  if (action === 'note' && focused) {
    openModalForItem(focused, 'note');
    return;
  }
  if (action === 'view' && focused) {
    window.open(redditPermalinkUrl(focused.permalink), '_blank', 'noopener,noreferrer');
    return;
  }
  if (action === 'spam') {
    if (!targetIds.length) return;
    removeIds(targetIds, defaultRemovalIndex(removalReasons), true);
    return;
  }
  if (action === 'mute' && focused) {
    try {
      await api.mute(focused.author, `Muted from KeyModerator (${focused.id})`);
      addToast(`Muted u/${focused.author}.`, 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Mute failed', 'error');
    }
    return;
  }

  if (!targetIds.length) return;

  const reportModResult = (label: string, run: () => Promise<{ failed: number; ok: number; errors?: string[] }>) => {
    void run()
      .then((response) => {
        if (response.failed) addToast(response.errors?.[0] ?? `${label} failed.`, 'error');
      })
      .catch((error) => addToast(error instanceof Error ? error.message : `${label} failed`, 'error'));
  };

  if (action === 'approve') {
    markApproved(targetIds);
    void api
      .approve(targetIds)
      .then((response) => {
        if (response.failed) {
          refresh();
          addToast(`Approved ${response.ok}/${targetIds.length}. ${response.failed} failed.`, 'warning');
        }
      })
      .catch((error) => {
        refresh();
        addToast(error instanceof Error ? error.message : 'Approve failed', 'error');
      });
    return;
  }

  if (action === 'lock') {
    reportModResult('Lock', () => runLock(targetIds, patchItem, findItem));
    return;
  }

  if (action === 'nsfw') {
    const postIds = targetIds.filter((id) => id.startsWith('t3_'));
    if (!postIds.length) {
      addToast('NSFW applies to posts only.', 'warning');
      return;
    }
    reportModResult('NSFW', () => runNsfw(postIds, patchItem, findItem));
    return;
  }

  if (action === 'spoiler') {
    const postIds = targetIds.filter((id) => id.startsWith('t3_'));
    if (!postIds.length) {
      addToast('Spoiler applies to posts only.', 'warning');
      return;
    }
    reportModResult('Spoiler', () => runSpoiler(postIds, patchItem, findItem));
    return;
  }

  if (action === 'sticky') {
    const postIds = targetIds.filter((id) => id.startsWith('t3_'));
    if (!postIds.length) {
      addToast('Highlights apply to posts only.', 'warning');
      return;
    }
    reportModResult('Highlight', () => runHighlight(postIds, patchItem, findItem));
    return;
  }

  if (action === 'distinguish') {
    reportModResult('Distinguish', () => runDistinguish(targetIds, patchItem, findItem));
    return;
  }

  if (action === 'ignoreReports') {
    reportModResult('Ignore reports', () => runIgnoreReports(targetIds, patchItem, findItem));
  }
}

export function defaultRemovalIndexFromReasons(reasons: RemovalReason[]) {
  return defaultRemovalIndex(reasons);
}
