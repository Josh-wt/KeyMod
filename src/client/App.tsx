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
import { QueueItem } from './components/QueueItem';
import { SelectionBar } from './components/SelectionBar';
import { UndoToast } from './components/UndoToast';
import { UserPanel } from './components/UserPanel';
import type { KeyAction, Toast, UserInfo } from '../shared';

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

  const addToast = useCallback((message: string, kind: Toast['kind'] = 'info', persistent = false) => {
    const toast = { id: crypto.randomUUID(), kind, message, persistent };
    setToasts((current) => [...current, toast]);
    if (!persistent) window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== toast.id)), 4000);
  }, []);

  const queue = useQueue(addToast);
  const selectedCount = queue.state.selectedIds.size;

  const remove = useCallback(
    async (reasonIndex: number) => {
      const ids = queue.targetIds;
      if (!ids.length) return;
      const reason = reasonIndex.toString();
      setLastRemovalCount(ids.length);
      setLastRemovalReason(`Rule ${reason}`);
      try {
        const response = await api.remove(ids, reasonIndex);
        queue.markRemoved(ids, response.batchId);
        if (response.failed) addToast(`Removed ${response.ok}/${ids.length} items. ${response.failed} failed.`, 'warning');
        else addToast(`Removed ${ids.length} items.`, 'success');
      } catch (error) {
        addToast(error instanceof Error ? error.message : 'Remove failed', 'error');
      }
    },
    [addToast, queue],
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

  const dispatch = useCallback(
    async (action: KeyAction) => {
      const focused = queue.focused;
      if (action === 'next') queue.moveFocus(1);
      if (action === 'prev') queue.moveFocus(-1);
      if (action === 'select') queue.toggleFocused();
      if (action === 'help') setShowHelp((value) => !value);
      if (action === 'undo') await undo();
      if (action === 'user' && focused) setUserPanel(focused.author);
      if (action === 'ban' && focused) setModal('ban');
      if (action === 'flair' && focused) setModal('flair');
      if (action === 'note' && focused) setModal('note');
      if (action === 'approve') {
        const ids = queue.targetIds;
        if (!ids.length) return;
        const response = await api.approve(ids);
        addToast(response.failed ? `Approved ${response.ok}/${ids.length}. ${response.failed} failed.` : `Approved ${response.ok}.`, response.failed ? 'warning' : 'success');
        await queue.load();
      }
      if (action === 'lock') {
        const ids = queue.targetIds;
        if (!ids.length) return;
        const response = await api.lock(ids);
        addToast(response.failed ? `Locked ${response.ok}/${ids.length}. ${response.failed} failed.` : `Locked ${response.ok}.`, response.failed ? 'warning' : 'success');
      }
    },
    [addToast, queue, undo],
  );

  const settings = useKeymap(dispatch, remove, modal !== null, addToast);

  const subreddit = useMemo(() => queue.state.items[0]?.subreddit ?? 'subreddit', [queue.state.items]);
  const focused = queue.focused;

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
    <main className="app-shell" onMouseUp={queue.endDrag}>
      <header className="topbar">
        <div>
          <h1>KeyQueue</h1>
          <span>r/{subreddit}</span>
        </div>
        <nav>
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
          <QueueItem
            key={item.id}
            item={item}
            index={index}
            focused={index === queue.state.focusedIndex}
            selected={queue.state.selectedIds.has(item.id)}
            dragPreviewed={queue.state.dragPreviewIds.has(item.id)}
            onToggle={queue.toggleSelected}
            onDragStart={queue.startDrag}
            onDragUpdate={queue.updateDrag}
          />
        ))}
        {queue.state.isLoading ? <div className="empty-state">Loading queue</div> : null}
        {!queue.state.isLoading && !queue.state.items.length ? <div className="empty-state">Queue is empty</div> : null}
      </section>

      <SelectionBar selectedCount={selectedCount} focusedCount={focused ? 1 : 0} />

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

      {modal === 'ban' && focused ? (
        <BanModal
          username={focused.author}
          onCancel={() => setModal(null)}
          onSubmit={async (duration, reason) => {
            await api.ban(focused.authorId, duration, reason);
            setModal(null);
            addToast(`Banned u/${focused.author}.`, 'success');
          }}
        />
      ) : null}

      {modal === 'flair' && focused ? (
        <FlairModal
          onCancel={() => setModal(null)}
          onSelect={async (flairId) => {
            await api.flair(focused.id, flairId);
            setModal(null);
            addToast('Flair applied.', 'success');
          }}
        />
      ) : null}

      {modal === 'note' && focused ? (
        <NoteModal
          username={focused.author}
          onCancel={() => setModal(null)}
          onSubmit={async (note) => {
            await api.note(focused.authorId, note);
            setModal(null);
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
