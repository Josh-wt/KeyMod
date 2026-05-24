import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { api } from './api';
import { useFeedList } from './useFeedList';
import { useKeymap } from './useKeymap';
import { useQueue } from './useQueue';
import { BanModal } from './components/BanModal';
import { CommandPalette, type Command } from './components/CommandPalette';
import { FeaturePanel, type FeaturePanelKind } from './components/FeaturePanel';
import { FlairModal } from './components/FlairModal';
import { HelpOverlay } from './components/HelpOverlay';
import { NoteModal } from './components/NoteModal';
import { RemovalReasonModal } from './components/RemovalReasonModal';
import { QueueItem as QueueItemRow } from './components/QueueItem';
import { SelectionBar } from './components/SelectionBar';
import { UndoToast } from './components/UndoToast';
import { UserPanel } from './components/UserPanel';
import type { AppSettings, KeyAction, QueueItem, SubredditRule, Toast, UserInfo } from '../shared';
import { DEFAULT_KEYMAP } from '../settings';
import { createModHandlers } from './createModHandlers';
import { resolveRemovalReasonIndex } from './ruleMode';
import { runKeyAction } from './keyActions';
import { QueueToolbar } from './components/QueueToolbar';
import { FeedView } from './components/FeedView';

type Modal = 'ban' | 'flair' | 'note' | 'remove' | null;
type AppView = 'queue' | 'feed';

function closestQueueRow(node: Node | null) {
  const element = node instanceof Element ? node : node?.parentElement;
  return element?.closest<HTMLElement>('.queue-row[data-queue-id]') ?? null;
}

export default function App() {
  const [view, setView] = useState<AppView>('queue');
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
  const [removeAsSpam, setRemoveAsSpam] = useState(false);
  const [subredditRules, setSubredditRules] = useState<SubredditRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [rulesPanelExpanded, setRulesPanelExpanded] = useState(() => {
    if (typeof window === 'undefined') return true;
    return !window.matchMedia('(max-width: 720px)').matches;
  });
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);
  const [activeRule, setActiveRule] = useState<SubredditRule | null>(null);

  const addToast = useCallback((message: string, kind: Toast['kind'] = 'info', persistent = false) => {
    const toast = { id: crypto.randomUUID(), kind, message, persistent };
    setToasts((current) => [...current, toast]);
    if (!persistent) window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== toast.id)), 4000);
  }, []);

  const queue = useQueue(addToast);
  const feed = useFeedList(addToast);
  const isQueueView = view === 'queue';
  const selectedCount = isQueueView ? queue.state.selectedIds.size : feed.state.selectedIds.size;

  const clearSelection = useCallback(() => {
    if (isQueueView) queue.clearSelection();
    else feed.clearSelection();
    window.getSelection()?.removeAllRanges();
  }, [feed, isQueueView, queue]);

  const removeIds = useCallback(
    (ids: string[], reasonIndex: number, asSpam = false, removalReason?: { id?: string; title?: string }) => {
      if (!ids.length) return;
      const list = isQueueView ? queue : feed;
      const removedItems = list.visibleItems.filter((item) => ids.includes(item.id));
      const pendingBatchId = crypto.randomUUID();

      setLastRemovalCount(ids.length);
      setLastRemovalReason(asSpam ? 'Spam' : (activeRule?.shortName ?? `Rule ${reasonIndex}`));
      list.markRemoved(ids, pendingBatchId);

      void api
        .remove(ids, reasonIndex, asSpam, removalReason?.id, removalReason?.title)
        .then((response) => {
          list.setRemovalBatchId(response.batchId);
          if (response.failed) {
            void list.refresh();
            addToast(`Removed ${response.ok}/${ids.length} items. ${response.failed} failed.`, 'warning');
          }
        })
        .catch((error) => {
          list.restoreItems(removedItems);
          addToast(error instanceof Error ? error.message : 'Remove failed', 'error');
        });
    },
    [activeRule, addToast, feed, isQueueView, queue],
  );

  const remove = useCallback(
    (reasonIndex: number) => {
      const targetIds = isQueueView ? queue.targetIds : feed.targetIds;
      removeIds(targetIds, reasonIndex);
    },
    [feed.targetIds, isQueueView, queue.targetIds, removeIds],
  );

  const focusItem = useCallback(
    (item: QueueItem) => {
      const items = isQueueView ? queue.visibleItems : feed.visibleItems;
      const index = items.findIndex((entry) => entry.id === item.id);
      if (index < 0) return;
      if (isQueueView) queue.focusIndex(index);
      else feed.focusIndex(index);
    },
    [feed, isQueueView, queue],
  );

  const undo = useCallback(async () => {
    const batchId = isQueueView ? queue.state.lastBatchId : feed.state.lastBatchId;
    if (!batchId) return;
    try {
      const response = await api.undo(batchId);
      if (isQueueView) {
        queue.clearUndo();
        await queue.load();
      } else {
        feed.clearUndo();
        feed.refresh();
      }
      addToast(`Restored ${response.restored} items.`, response.failed ? 'warning' : 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Undo failed', 'error');
    }
  }, [addToast, feed, isQueueView, queue]);

  const settingsRef = useRef<AppSettings>({
    keymap: DEFAULT_KEYMAP,
    removalReasons: [],
    banReasons: [],
    conflicts: [],
  });

  const openModalForItem = useCallback(
    (item: QueueItem, nextModal: Modal) => {
      focusItem(item);
      setModalItem(item);
      setModal(nextModal);
      setOpenMenuId(null);
    },
    [focusItem],
  );

  const openRemovalModal = useCallback(
    (item: QueueItem, asSpam = false) => {
      focusItem(item);
      setModalItem(item);
      setRemoveAsSpam(asSpam);
      setModal('remove');
      setOpenMenuId(null);
    },
    [focusItem],
  );

  const dispatch = useCallback(
    async (action: KeyAction) => {
      const list = isQueueView ? queue : feed;
      await runKeyAction(action, {
        targetIds: list.targetIds,
        focused: list.focused,
        findItem: (id) => list.visibleItems.find((item) => item.id === id),
        removalReasons: settingsRef.current.removalReasons,
        patchItem: list.patchItem,
        markApproved: list.markApproved,
        removeIds,
        moveFocus: list.moveFocus,
        toggleFocused: list.toggleFocused,
        selectAllVisible: list.selectAllVisible,
        clearSelection,
        refresh: list.refresh,
        setShowHelp,
        undo,
        setUserPanel,
        openModalForItem,
        addToast,
      });
    },
    [addToast, clearSelection, feed, isQueueView, openModalForItem, queue, removeIds, undo],
  );

  const settings = useKeymap(
    dispatch,
    remove,
    async (reasonIndex) => {
      const focused = isQueueView ? queue.focused : feed.focused;
      if (!focused) return;
      const banReason = settingsRef.current.banReasons.find((item) => item.index === reasonIndex);
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
    clearSelection,
  );

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const subreddit = useMemo(() => {
    const items = isQueueView ? queue.state.items : feed.state.items;
    return items[0]?.subreddit ?? 'subreddit';
  }, [feed.state.items, isQueueView, queue.state.items]);

  useEffect(() => {
    if (window.matchMedia('(max-width: 720px)').matches) {
      setRulesPanelExpanded(false);
    }
  }, []);

  useEffect(() => {
    setRulesLoading(true);
    api
      .subredditRules()
      .then((response) => setSubredditRules(response.rules))
      .catch(() => setSubredditRules([]))
      .finally(() => setRulesLoading(false));
  }, [subreddit]);


  const handleRuleExpand = useCallback((ruleId: string) => {
    setExpandedRuleId((current) => (current === ruleId ? null : ruleId));
  }, []);

  const handleRemovalModeToggle = useCallback((rule: SubredditRule) => {
    if (activeRule?.id === rule.id) {
      setActiveRule(null);
      return;
    }
    setActiveRule(rule);
    setExpandedRuleId(rule.id);
  }, [activeRule]);

  const handleItemToggle = useCallback(
    (id: string) => {
      if (activeRule) {
        const reasonIndex = resolveRemovalReasonIndex(activeRule, settingsRef.current.removalReasons);
        removeIds([id], reasonIndex, false, { id: activeRule.removalReasonId, title: activeRule.shortName });
        return;
      }
      if (isQueueView) queue.toggleSelected(id);
      else feed.toggleSelected(id);
    },
    [activeRule, feed, isQueueView, queue, removeIds],
  );

  const focused = isQueueView ? queue.focused : feed.focused;
  const undoCountdown = isQueueView ? queue.state.undoCountdown : feed.state.undoCountdown;

  const modHandlers = useMemo(
    () =>
      createModHandlers({
        removalReasons: settings.removalReasons,
        findItem: (id) => (isQueueView ? queue.visibleItems : feed.visibleItems).find((item) => item.id === id),
        refresh: () => {
          if (isQueueView) queue.refresh();
          else feed.refresh();
        },
        focusItem,
        setOpenMenuId,
        removeIds,
        markApproved: (ids) => {
          if (isQueueView) queue.markApproved(ids);
          else feed.markApproved(ids);
        },
        patchItem: (id, patch) => {
          if (isQueueView) queue.patchItem(id, patch);
          else feed.patchItem(id, patch);
        },
        openModalForItem,
        openRemovalModal,
        setUserPanel,
        addToast,
      }),
    [addToast, feed, focusItem, isQueueView, openModalForItem, openRemovalModal, queue, removeIds, settings.removalReasons],
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
      const selectedRows = new Set<HTMLElement>();
      const addRow = (row: HTMLElement | null) => {
        if (row) selectedRows.add(row);
      };

      addRow(closestQueueRow(selection.anchorNode));
      addRow(closestQueueRow(selection.focusNode));

      const queueRows = Array.from(document.querySelectorAll<HTMLElement>('.queue-row[data-queue-id]'));
      const anchorRow = closestQueueRow(selection.anchorNode);
      const focusRow = closestQueueRow(selection.focusNode);
      if (anchorRow && focusRow && anchorRow !== focusRow) {
        const anchorIndex = queueRows.indexOf(anchorRow);
        const focusIndex = queueRows.indexOf(focusRow);
        if (anchorIndex >= 0 && focusIndex >= 0) {
          const [start, end] = [anchorIndex, focusIndex].sort((a, b) => a - b);
          queueRows.slice(start, end + 1).forEach(addRow);
        }
      }

      queueRows.forEach((row) => {
        try {
          if (range.intersectsNode(row)) addRow(row);
        } catch {
          // Some browsers can reject intersection checks against complex nested markup.
        }
      });

      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          try {
            return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
          } catch {
            return NodeFilter.FILTER_REJECT;
          }
        },
      });
      for (let node = walker.nextNode(); node; node = walker.nextNode()) addRow(closestQueueRow(node));

      const selectedRowIds = Array.from(selectedRows)
        .map((row) => row.dataset.queueId)
        .filter((id): id is string => Boolean(id));

      if (isQueueView) queue.selectIds(selectedRowIds);
      else feed.selectIds(selectedRowIds);
    }

    function onPointerUp() {
      selectRowsFromNativeTextSelection();
      if (isQueueView) queue.endDrag();
      else feed.endDrag();
    }
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [feed, isQueueView, queue]);

  useEffect(() => {
    setOpenMenuId(null);
  }, [feed.state.focusedIndex, isQueueView, queue.state.focusedIndex]);

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
    <main
      className={`app-shell feed-shell${activeRule ? ' removal-mode-active' : ''}`}
      onMouseUp={() => {
        if (isQueueView) queue.endDrag();
        else feed.endDrag();
      }}
    >
      <header className="topbar topbar-minimal">
        <span className="feed-context">r/{subreddit}</span>
        <nav className="view-tabs" aria-label="Switch view">
          <button
            className={view === 'queue' ? 'active' : ''}
            onClick={() => setView('queue')}
            aria-pressed={view === 'queue'}
          >
            Queue
          </button>
          <button
            className={view === 'feed' ? 'active' : ''}
            onClick={() => setView('feed')}
            aria-pressed={view === 'feed'}
          >
            Feed
          </button>
        </nav>
        <nav className="topbar-actions">
          <button onClick={() => setShowCommandPalette(true)} aria-label="Open global actions">
            Ctrl+K
          </button>
          <button onClick={() => setShowHelp(true)} aria-label="Open help">
            ?
          </button>
          <button type="button" className="topbar-close" onClick={() => window.close()} aria-label="Close">
            <X size={16} />
          </button>
        </nav>
      </header>

      {settings.conflicts.map((conflict) => (
        <div className="warning-banner" key={`${conflict.key}:${conflict.actions.join('-')}`}>
          Key conflict: {conflict.actions.join(' and ')} both use <kbd>{conflict.key}</kbd>
        </div>
      ))}

      {view === 'queue' ? (
        <>
          <div className="queue-workspace">
            <QueueToolbar
              filter={queue.state.filter}
              stats={queue.stats}
              isLoading={queue.state.isLoading}
              onFilterChange={queue.setFilter}
              onRefresh={queue.refresh}
              rules={subredditRules}
              rulesLoading={rulesLoading}
              rulesPanelExpanded={rulesPanelExpanded}
              onRulesPanelExpandedChange={setRulesPanelExpanded}
              expandedRuleId={expandedRuleId}
              activeRuleId={activeRule?.id ?? null}
              onRuleExpand={handleRuleExpand}
              onRemovalModeToggle={handleRemovalModeToggle}
            />

            <section className="queue-list">
              {queue.visibleItems.map((item, index) => (
                <QueueItemRow
                  key={item.id}
                  item={item}
                  index={index}
                  previousItem={index > 0 ? queue.visibleItems[index - 1] : undefined}
                  focused={index === queue.state.focusedIndex && queue.state.focusedIndex >= 0}
                  selected={queue.state.selectedIds.has(item.id)}
                  dragPreviewed={queue.state.dragPreviewIds.has(item.id)}
                  modHandlers={modHandlers}
                  menuOpen={openMenuId === item.id}
                  onMenuOpenChange={(open) => setOpenMenuId(open ? item.id : null)}
                  onToggle={handleItemToggle}
                  onFocusIndex={queue.focusIndex}
                  onDragStart={queue.startDrag}
                  onDragUpdate={queue.updateDrag}
                  onFocusLeave={queue.clearHover}
                />
              ))}
              {queue.state.isLoading ? <div className="empty-state">Loading queue</div> : null}
              {!queue.state.isLoading && !queue.visibleItems.length ? (
                <div className="empty-state">{queue.state.items.length ? 'No items match this filter' : 'Queue is empty'}</div>
              ) : null}
            </section>
          </div>

          {activeRule ? (
            <div className="rule-mode-banner">
              <strong>{activeRule.shortName}</strong> removal mode — tap a row checkbox to remove.
            </div>
          ) : null}

          {selectedCount > 0 ? <SelectionBar selectedCount={selectedCount} focusedCount={focused ? 1 : 0} /> : null}
        </>
      ) : (
        <>
          <FeedView
            subreddit={subreddit}
            feed={feed}
            modHandlers={modHandlers}
            openMenuId={openMenuId}
            onMenuOpenChange={setOpenMenuId}
            rules={subredditRules}
            rulesLoading={rulesLoading}
            rulesPanelExpanded={rulesPanelExpanded}
            onRulesPanelExpandedChange={setRulesPanelExpanded}
            expandedRuleId={expandedRuleId}
            activeRuleId={activeRule?.id ?? null}
            onRuleExpand={handleRuleExpand}
              onRemovalModeToggle={handleRemovalModeToggle}
            onToggle={handleItemToggle}
          />
          {activeRule ? (
            <div className="rule-mode-banner">
              <strong>{activeRule.shortName}</strong> removal mode — tap a row checkbox to remove.
            </div>
          ) : null}
          {selectedCount > 0 ? <SelectionBar selectedCount={selectedCount} focusedCount={focused ? 1 : 0} /> : null}
        </>
      )}

      <div className="toast-stack">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.kind}`}>
            {toast.message}
          </div>
        ))}
      </div>

      {undoCountdown !== null ? (
        <UndoToast
          count={lastRemovalCount}
          reason={lastRemovalReason}
          countdown={undoCountdown}
          onUndo={undo}
          onDone={() => {
            if (isQueueView) queue.clearUndo();
            else feed.clearUndo();
          }}
        />
      ) : null}

      {modal === 'remove' && actionItem ? (
        <RemovalReasonModal
          title={removeAsSpam ? 'Remove as spam' : 'Remove item'}
          reasons={settings.removalReasons}
          asSpam={removeAsSpam}
          onCancel={() => {
            setModal(null);
            setModalItem(null);
            setRemoveAsSpam(false);
          }}
          onSubmit={(reasonIndex) => {
            removeIds([actionItem.id], reasonIndex, removeAsSpam);
            setModal(null);
            setModalItem(null);
            setRemoveAsSpam(false);
          }}
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
            const response = await api.flair(actionItem.id, flairId);
            if (response.flairText !== undefined) {
              const patch = { flairText: response.flairText || undefined };
              if (isQueueView) queue.patchItem(actionItem.id, patch);
              else feed.patchItem(actionItem.id, patch);
            }
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
