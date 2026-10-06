import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Fragment } from 'react';
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
  onHoverItem?: (item: FeedList['visibleItems'][number]) => void;
  tapToSelect?: boolean;
  onLongPress?: (id: string) => void;
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
  onHoverItem,
  tapToSelect,
  onLongPress,
}: Props) {
  const { state, visibleItems } = feed;

  return (
    <div className={`queue-workspace${state.activePost ? ' thread-workspace' : ''}`}>
      <aside className="filter-sidebar" aria-label="Feed controls">
        <section className="sidebar-panel sidebar-panel-queue">
          {state.activePost ? <button type="button" className="thread-back-button" onClick={feed.closePost}>
            <ArrowLeft size={14} /> Back to feed
          </button> : null}
          <div className="sidebar-panel-toolbar">
            <h2 className="sidebar-section-title">{state.activePost ? 'Thread' : 'Feed'}</h2>
            <div className="sidebar-toolbar-actions">
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

      <section className={`queue-list${state.activePost ? ' thread-list' : ''}`} aria-label={state.activePost ? 'Reddit thread' : 'Subreddit feed'}>
        {visibleItems.map((item, index) => (
          <Fragment key={item.id}>
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
            onHoverItem={onHoverItem}
            expandPost={Boolean(state.activePost && item.id === state.activePost.id)}
            tapToSelect={tapToSelect}
            onLongPress={onLongPress}
          />
          {state.activePost && index === 0 ? <div className="thread-heading">
            <h3>Comments <span>{state.comments.length}</span></h3>
            <button type="button" onClick={feed.refresh} disabled={state.isLoading} aria-label="Refresh thread">
              <RefreshCw size={14} className={state.isLoading ? 'spin' : ''} /> Refresh
            </button>
          </div> : null}
          </Fragment>
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
