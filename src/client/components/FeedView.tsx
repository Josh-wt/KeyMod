import { ArrowLeft, RefreshCw } from 'lucide-react';
import type { FeedSort, SubredditRule } from '../../shared';
import type { ModItemHandlers } from '../modActions';
import type { useFeedList } from '../useFeedList';
import { QueueItem as QueueItemRow } from './QueueItem';
import { RulesSidebar } from './RulesSidebar';

type FeedList = ReturnType<typeof useFeedList>;

type Props = {
  subreddit: string;
  feed: FeedList;
  modHandlers: ModItemHandlers;
  openMenuId: string | null;
  onMenuOpenChange: (id: string | null) => void;
  rules: SubredditRule[];
  rulesLoading: boolean;
  rulesPanelExpanded: boolean;
  onRulesPanelExpandedChange: (expanded: boolean) => void;
  expandedRuleId: string | null;
  activeRuleId: string | null;
  onRuleExpand: (ruleId: string) => void;
  onRemovalModeToggle: (rule: SubredditRule) => void;
  onToggle: (id: string) => void;
};

const SORTS: FeedSort[] = ['hot', 'new', 'top'];

export function FeedView({
  subreddit,
  feed,
  modHandlers,
  openMenuId,
  onMenuOpenChange,
  rules,
  rulesLoading,
  rulesPanelExpanded,
  onRulesPanelExpandedChange,
  expandedRuleId,
  activeRuleId,
  onRuleExpand,
  onRemovalModeToggle,
  onToggle,
}: Props) {
  const { state, visibleItems } = feed;

  return (
    <div className="queue-workspace">
      <aside className="filter-sidebar" aria-label="Feed controls">
        <section className="sidebar-panel sidebar-panel-queue">
          <div className="sidebar-panel-toolbar">
            <h2 className="sidebar-section-title">Feed</h2>
            <div className="sidebar-toolbar-actions">
              {state.activePost ? (
                <button
                  type="button"
                  className="sidebar-icon-button"
                  onClick={feed.closePost}
                  aria-label="Back to feed"
                  title="Back to feed"
                >
                  <ArrowLeft size={15} />
                </button>
              ) : null}
              <button
                type="button"
                className="sidebar-icon-button"
                onClick={feed.refresh}
                disabled={state.isLoading}
                aria-label="Refresh feed"
                title="Refresh feed"
              >
                <RefreshCw size={15} className={state.isLoading ? 'spin' : ''} />
              </button>
            </div>
          </div>
          <nav className="queue-filters" role="tablist" aria-label="Sort feed">
            {SORTS.map((sort) => (
              <button
                key={sort}
                type="button"
                role="tab"
                aria-selected={state.sort === sort}
                className={state.sort === sort ? 'active' : ''}
                onClick={() => feed.setSort(sort)}
              >
                <span className="queue-filter-label">{sort}</span>
              </button>
            ))}
          </nav>
        </section>

        <RulesSidebar
          rules={rules}
          isLoading={rulesLoading}
          panelExpanded={rulesPanelExpanded}
          onPanelExpandedChange={onRulesPanelExpandedChange}
          expandedRuleId={expandedRuleId}
          activeRuleId={activeRuleId}
          onRuleExpand={onRuleExpand}
          onRemovalModeToggle={onRemovalModeToggle}
        />
      </aside>

      <section className="queue-list">
        {visibleItems.map((item, index) => (
          <QueueItemRow
            key={item.id}
            item={item}
            index={index}
            visibleItems={visibleItems}
            previousItem={index > 0 ? visibleItems[index - 1] : undefined}
            nextItem={index < visibleItems.length - 1 ? visibleItems[index + 1] : undefined}
            focused={index === state.focusedIndex && state.focusedIndex >= 0}
            selected={state.selectedIds.has(item.id)}
            dragPreviewed={state.dragPreviewIds.has(item.id)}
            modHandlers={modHandlers}
            menuOpen={openMenuId === item.id}
            onMenuOpenChange={(open) => onMenuOpenChange(open ? item.id : null)}
            onToggle={onToggle}
            onFocusIndex={feed.focusIndex}
            onDragStart={feed.startDrag}
            onDragUpdate={feed.updateDrag}
            onFocusLeave={feed.clearHover}
            onOpenComments={feed.openPost}
            expandPost={Boolean(state.activePost && item.id === state.activePost.id)}
          />
        ))}
        {state.isLoading ? <div className="empty-state">Loading {state.activePost ? 'comments' : subreddit}</div> : null}
        {!state.isLoading && !visibleItems.length ? <div className="empty-state">No posts found</div> : null}
        {!state.isLoading && state.activePost && visibleItems.length === 1 ? (
          <div className="empty-state">No comments found</div>
        ) : null}
        {!state.isLoading && !state.activePost && state.after ? (
          <button className="feed-load-more" onClick={feed.loadMore}>
            Load more
          </button>
        ) : null}
      </section>
    </div>
  );
}
