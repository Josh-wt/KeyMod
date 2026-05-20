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
  removalReasons: RemovalReason[];
  patchItem: (id: string, patch: Partial<QueueItem>) => void;
  markApproved: (ids: string[]) => void;
  removeIds: (ids: string[], reasonIndex: number, asSpam?: boolean) => Promise<void>;
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
    await removeIds(targetIds, defaultRemovalIndex(removalReasons), true);
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

  try {
    if (action === 'approve') {
      const response = await api.approve(targetIds);
      if (response.failed) addToast(`Approved ${response.ok}/${targetIds.length}. ${response.failed} failed.`, 'warning');
      else {
        markApproved(targetIds);
        addToast(`Approved ${response.ok}.`, 'success');
      }
      return;
    }

    if (action === 'lock') {
      const response = await runLock(targetIds, patchItem);
      if (response.failed) addToast(response.errors?.[0] ?? 'Lock failed.', 'error');
      else addToast(`Updated lock on ${response.ok} item(s).`, 'success');
      return;
    }

    if (action === 'nsfw') {
      const postIds = targetIds.filter((id) => id.startsWith('t3_'));
      if (!postIds.length) {
        addToast('NSFW applies to posts only.', 'warning');
        return;
      }
      const response = await runNsfw(postIds, patchItem);
      if (response.failed) addToast(response.errors?.[0] ?? 'NSFW update failed.', 'error');
      else addToast(`Updated NSFW on ${response.ok} post(s).`, 'success');
      return;
    }

    if (action === 'spoiler') {
      const postIds = targetIds.filter((id) => id.startsWith('t3_'));
      if (!postIds.length) {
        addToast('Spoiler applies to posts only.', 'warning');
        return;
      }
      const response = await runSpoiler(postIds, patchItem);
      if (response.failed) addToast(response.errors?.[0] ?? 'Spoiler update failed.', 'error');
      else addToast(`Updated spoiler on ${response.ok} post(s).`, 'success');
      return;
    }

    if (action === 'sticky') {
      const postIds = targetIds.filter((id) => id.startsWith('t3_'));
      if (!postIds.length) {
        addToast('Highlights apply to posts only.', 'warning');
        return;
      }
      const response = await runHighlight(postIds, patchItem);
      if (response.failed) addToast(response.errors?.[0] ?? 'Highlight update failed.', 'error');
      else addToast(`Updated highlights on ${response.ok} post(s).`, 'success');
      return;
    }

    if (action === 'distinguish') {
      const response = await runDistinguish(targetIds, patchItem);
      if (response.failed) addToast(response.errors?.[0] ?? 'Distinguish failed.', 'error');
      else addToast(`Distinguished ${response.ok} item(s).`, 'success');
      return;
    }

    if (action === 'ignoreReports') {
      const response = await runIgnoreReports(targetIds, patchItem);
      if (response.failed) addToast(response.errors?.[0] ?? 'Ignore reports failed.', 'error');
      else addToast(`Updated report ignore on ${response.ok} item(s).`, 'success');
    }
  } catch (error) {
    addToast(error instanceof Error ? error.message : 'Action failed', 'error');
  }
}

export function defaultRemovalIndexFromReasons(reasons: RemovalReason[]) {
  return defaultRemovalIndex(reasons);
}
