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
        <div className="filter-sidebar-actions">
          {state.activePost ? (
            <button type="button" className="filter-sidebar-refresh" onClick={feed.closePost}>
              <ArrowLeft size={16} />
              <span>Feed</span>
            </button>
          ) : null}
          <button
            type="button"
            className="filter-sidebar-refresh"
            onClick={feed.refresh}
            disabled={state.isLoading}
          >
            <RefreshCw size={16} className={state.isLoading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          <div className="queue-filters" role="tablist" aria-label="Feed sort">
            {SORTS.map((s) => (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={state.sort === s}
                className={state.sort === s ? 'active' : ''}
                onClick={() => feed.setSort(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <section className="queue-list">
        {visibleItems.map((item, index) => (
          <QueueItemRow
            key={item.id}
            item={item}
            index={index}
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
