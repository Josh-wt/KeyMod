import { useCallback, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { api } from './api';
import { useKeymap } from './useKeymap';
import { useQueue } from './useQueue';
import { BanModal } from './components/BanModal';
import { CommandPalette, type Command } from './components/CommandPalette';
import { FeaturePanel, type FeaturePanelKind } from './components/FeaturePanel';
import { FlairModal } from './components/FlairModal';
import { HelpOverlay } from './components/HelpOverlay';
import { NoteModal } from './components/NoteModal';
import { QueueItem as QueueItemRow } from './components/QueueItem';
import { SelectionBar } from './components/SelectionBar';
import { UndoToast } from './components/UndoToast';
import { UserPanel } from './components/UserPanel';
import type { KeyAction, QueueItem, Toast, UserInfo } from '../shared';
import { createModHandlers } from './createModHandlers';

type Modal = 'ban' | 'flair' | 'note' | null;

export default function App() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [modal, setModal] = useState<Modal>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [featurePanel, setFeaturePanel] = useState<FeaturePanelKind | null>(null);
  const [userPanel, setUserPanel] = useState<string | null>(null);
  const [focusedUserInfo, setFocusedUserInfo] = useState<UserInfo | null>(null);
  const [lastRemovalCount, setLastRemovalCount] = useState(0);
  const [lastRemovalReason, setLastRemovalReason] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [modalItem, setModalItem] = useState<QueueItem | null>(null);

  const addToast = useCallback((message: string, kind: Toast['kind'] = 'info', persistent = false) => {
    const toast = { id: crypto.randomUUID(), kind, message, persistent };
    setToasts((current) => [...current, toast]);
    if (!persistent) window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== toast.id)), 4000);
  }, []);

  const queue = useQueue(addToast);
  const selectedCount = queue.state.selectedIds.size;

  const removeIds = useCallback(
    async (ids: string[], reasonIndex: number, asSpam = false) => {
      if (!ids.length) return;
      setLastRemovalCount(ids.length);
      setLastRemovalReason(asSpam ? 'Spam' : `Rule ${reasonIndex}`);
      try {
        const response = await api.remove(ids, reasonIndex, asSpam);
        queue.markRemoved(ids, response.batchId);
        if (response.failed) addToast(`Removed ${response.ok}/${ids.length} items. ${response.failed} failed.`, 'warning');
        else addToast(`Removed ${ids.length} items.`, 'success');
      } catch (error) {
        addToast(error instanceof Error ? error.message : 'Remove failed', 'error');
      }
    },
    [addToast, queue],
  );

  const remove = useCallback(
    async (reasonIndex: number) => {
      await removeIds(queue.targetIds, reasonIndex);
    },
    [queue.targetIds, removeIds],
  );

  const focusItem = useCallback(
    (item: QueueItem) => {
      const index = queue.state.items.findIndex((entry) => entry.id === item.id);
      if (index >= 0) queue.focusIndex(index);
    },
    [queue],
  );

  const undo = useCallback(async () => {
    if (!queue.state.lastBatchId) return;
    try {
      const response = await api.undo(queue.state.lastBatchId);
      queue.clearUndo();
      await queue.load();
      addToast(`Restored ${response.restored} items.`, response.failed ? 'warning' : 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Undo failed', 'error');
    }
  }, [addToast, queue]);

  const openModalForItem = useCallback(
    (item: QueueItem, nextModal: Modal) => {
      focusItem(item);
      setModalItem(item);
      setModal(nextModal);
      setOpenMenuId(null);
    },
    [focusItem],
  );

  const dispatch = useCallback(
    async (action: KeyAction) => {
      const focused = queue.focused;
      if (action === 'next') queue.moveFocus(1);
      if (action === 'prev') queue.moveFocus(-1);
      if (action === 'select') queue.toggleFocused();
      if (action === 'help') setShowHelp((value) => !value);
      if (action === 'undo') await undo();
      if (action === 'user' && focused) setUserPanel(focused.author);
      if (action === 'ban' && focused) openModalForItem(focused, 'ban');
      if (action === 'flair' && focused) openModalForItem(focused, 'flair');
      if (action === 'note' && focused) openModalForItem(focused, 'note');
      if (action === 'approve') {
        const ids = queue.targetIds;
        if (!ids.length) return;
        try {
          const response = await api.approve(ids);
          if (response.failed) {
            addToast(`Approved ${response.ok}/${ids.length}. ${response.failed} failed.`, 'warning');
          } else {
            queue.markApproved(ids);
            addToast(`Approved ${response.ok}.`, 'success');
          }
        } catch (error) {
          addToast(error instanceof Error ? error.message : 'Approve failed', 'error');
        }
      }
      if (action === 'lock') {
        const ids = queue.targetIds;
        if (!ids.length) return;
        try {
          const response = await api.lock(ids);
          if (response.failed) {
            addToast(response.errors?.[0] ?? 'Lock action failed.', 'error');
            return;
          }
          for (const update of response.updates ?? []) {
            const { id, ...patch } = update;
            queue.patchItem(id, patch);
          }
          addToast(`Updated lock on ${response.ok} item(s).`, 'success');
        } catch (error) {
          addToast(error instanceof Error ? error.message : 'Lock failed', 'error');
        }
      }
    },
    [addToast, openModalForItem, queue, undo],
  );

  const settings = useKeymap(
    dispatch,
    remove,
    async (reasonIndex) => {
      const focused = queue.focused;
      if (!focused) return;
      const banReason = settings.banReasons.find((item) => item.index === reasonIndex);
      if (!banReason?.reason.trim()) {
        addToast(`Ban reason ${reasonIndex} is not configured.`, 'warning');
        return;
      }
      try {
        await api.ban(
          focused.author,
          banReason.duration === 0 ? 'permanent' : banReason.duration,
          banReason.reason,
          banReason.message,
          banReason.note,
          focused.id,
        );
        addToast(`Banned u/${focused.author}: ${banReason.reason}`, 'success');
      } catch (error) {
        addToast(error instanceof Error ? error.message : 'Ban failed', 'error');
      }
    },
    modal !== null,
    addToast,
  );

  const subreddit = useMemo(() => queue.state.items[0]?.subreddit ?? 'subreddit', [queue.state.items]);
  const focused = queue.focused;

  const modHandlers = useMemo(
    () =>
      createModHandlers({
        removalReasons: settings.removalReasons,
        focusItem,
        setOpenMenuId,
        removeIds,
        markApproved: queue.markApproved,
        patchItem: queue.patchItem,
        openModalForItem,
        setUserPanel,
        addToast,
      }),
    [addToast, focusItem, openModalForItem, queue.markApproved, queue.patchItem, removeIds, settings.removalReasons],
  );

  const actionItem = modalItem ?? focused;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setShowCommandPalette((value) => !value);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    function selectRowsFromNativeTextSelection() {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      const selectedRowIds = Array.from(document.querySelectorAll<HTMLElement>('.queue-row[data-queue-id]'))
        .filter((row) => {
          try {
            return range.intersectsNode(row);
          } catch {
            return false;
          }
        })
        .map((row) => row.dataset.queueId)
        .filter((id): id is string => Boolean(id));

      queue.selectIds(selectedRowIds);
    }

    function onPointerUp() {
      selectRowsFromNativeTextSelection();
      queue.endDrag();
    }
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [queue.endDrag]);

  useEffect(() => {
    setOpenMenuId(null);
  }, [queue.state.focusedIndex]);

  useEffect(() => {
    setFocusedUserInfo(null);
    if (!focused?.author) return;
    api.user(focused.author).then(setFocusedUserInfo).catch(() => undefined);
  }, [focused?.author]);

  const commands = useMemo<Command[]>(() => {
    return [
      {
        id: 'notes-open',
        title: 'Open user notes',
        subtitle: 'Browse persistent moderator notes tools',
        section: 'User Notes',
        keywords: ['notes', 'usernotes', 'history', 'global'],
        run: () => setFeaturePanel('notes'),
      },
      {
        id: 'reasons-open',
        title: 'Browse removal reasons',
        subtitle: 'Review Ctrl+1 through Ctrl+9 templates',
        section: 'Removal Reasons',
        keywords: ['remove', 'reason', 'template', 'message'],
        run: () => setFeaturePanel('reasons'),
      },
      {
        id: 'queue-tools-open',
        title: 'Open queue tools',
        subtitle: 'Selection, reports, batch workflow overview',
        section: 'Queue Tools',
        keywords: ['queue', 'tools', 'batch', 'selection', 'global'],
        run: () => setFeaturePanel('queue-tools'),
      },
      {
        id: 'notifications-open',
        title: 'Open notifications',
        subtitle: 'Modqueue, modmail, messages, unmoderated alerts',
        section: 'Notifications',
        keywords: ['alerts', 'modmail', 'messages', 'counts'],
        run: () => setFeaturePanel('notifications'),
      },
      {
        id: 'mod-log-open',
        title: 'Open mod log matrix',
        subtitle: 'Moderator action breakdown by action and time window',
        section: 'Mod Log Matrix',
        keywords: ['log', 'matrix', 'actions', 'breakdown'],
        run: () => setFeaturePanel('mod-log'),
      },
      {
        id: 'automod-open',
        title: 'Open AutoMod',
        subtitle: 'Config, validation, and filtered content overview',
        section: 'AutoMod',
        keywords: ['automod', 'automoderator', 'yaml', 'rules', 'filters'],
        run: () => setFeaturePanel('automod'),
      },
    ];
  }, []);

  return (
    <main className="app-shell feed-shell" onMouseUp={queue.endDrag}>
      <header className="topbar topbar-minimal">
        <span className="feed-context">r/{subreddit}</span>
        <nav className="topbar-actions">
          <button onClick={() => setShowCommandPalette(true)} aria-label="Open global actions">
            Ctrl+K
          </button>
          <button onClick={() => setShowHelp(true)} aria-label="Open help">
            ?
          </button>
          <button onClick={() => window.close()} aria-label="Close">
            <X size={16} />
          </button>
        </nav>
      </header>

      {settings.conflicts.map((conflict) => (
        <div className="warning-banner" key={`${conflict.key}:${conflict.actions.join('-')}`}>
          Key conflict: {conflict.actions.join(' and ')} both use <kbd>{conflict.key}</kbd>
        </div>
      ))}

      <section className="queue-list">
        {queue.state.items.map((item, index) => (
          <QueueItemRow
            key={item.id}
            item={item}
            index={index}
            focused={index === queue.state.focusedIndex}
            selected={queue.state.selectedIds.has(item.id)}
            dragPreviewed={queue.state.dragPreviewIds.has(item.id)}
            modHandlers={modHandlers}
            menuOpen={openMenuId === item.id}
            onMenuOpenChange={(open) => setOpenMenuId(open ? item.id : null)}
            onToggle={queue.toggleSelected}
            onFocusIndex={queue.focusIndex}
            onDragStart={queue.startDrag}
            onDragUpdate={queue.updateDrag}
          />
        ))}
        {queue.state.isLoading ? <div className="empty-state">Loading queue</div> : null}
        {!queue.state.isLoading && !queue.state.items.length ? <div className="empty-state">Queue is empty</div> : null}
      </section>

      {selectedCount > 0 ? <SelectionBar selectedCount={selectedCount} focusedCount={focused ? 1 : 0} /> : null}

      <div className="toast-stack">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.kind}`}>
            {toast.message}
          </div>
        ))}
      </div>

      {queue.state.undoCountdown !== null ? (
        <UndoToast
          count={lastRemovalCount}
          reason={lastRemovalReason}
          countdown={queue.state.undoCountdown}
          onUndo={undo}
          onDone={queue.clearUndo}
        />
      ) : null}

      {modal === 'ban' && actionItem ? (
        <BanModal
          username={actionItem.author}
          onCancel={() => {
            setModal(null);
            setModalItem(null);
          }}
          onSubmit={async (duration, reason) => {
            await api.ban(actionItem.author, duration, reason, '', '', actionItem.id);
            setModal(null);
            setModalItem(null);
            addToast(`Banned u/${actionItem.author}.`, 'success');
          }}
        />
      ) : null}

      {modal === 'flair' && actionItem ? (
        <FlairModal
          onCancel={() => {
            setModal(null);
            setModalItem(null);
          }}
          onSelect={async (flairId) => {
            await api.flair(actionItem.id, flairId);
            setModal(null);
            setModalItem(null);
            addToast('Flair applied.', 'success');
          }}
        />
      ) : null}

      {modal === 'note' && actionItem ? (
        <NoteModal
          username={actionItem.author}
          onCancel={() => {
            setModal(null);
            setModalItem(null);
          }}
          onSubmit={async (note) => {
            await api.note(actionItem.author, note, actionItem.id);
            setModal(null);
            setModalItem(null);
            addToast('Mod note saved.', 'success');
          }}
        />
      ) : null}

      {userPanel ? <UserPanel username={userPanel} onClose={() => setUserPanel(null)} /> : null}
      {featurePanel ? (
        <FeaturePanel
          kind={featurePanel}
          focused={focused}
          removalReasons={settings.removalReasons}
          userInfo={focusedUserInfo}
          selectedCount={selectedCount}
          onClose={() => setFeaturePanel(null)}
        />
      ) : null}
      {showHelp ? <HelpOverlay keymap={settings.keymap} onClose={() => setShowHelp(false)} /> : null}
      {showCommandPalette ? <CommandPalette commands={commands} onClose={() => setShowCommandPalette(false)} /> : null}
    </main>
  );
}
