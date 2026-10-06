import { MessageCircle, RefreshCw } from 'lucide-react';
import type { PostMediaKind, QueueFilter, QueuePostKindFilter, SubredditRule } from '../../shared';
import { RulesSidebar } from './RulesSidebar';

type Stats = {
  total: number;
  posts: number;
  comments: number;
  reported: number;
};

type PostKindStats = Record<PostMediaKind, number>;

type Props = {
  filter: QueueFilter;
  postKindFilter: QueuePostKindFilter;
  stats: Stats;
  postKindStats: PostKindStats;
  isLoading: boolean;
  onFilterChange: (filter: QueueFilter) => void;
  onPostKindFilterChange: (filter: QueuePostKindFilter) => void;
  onRefresh: () => void;
  onNextComment?: () => void;
  rules: SubredditRule[];
  rulesLoading: boolean;
  rulesPanelExpanded: boolean;
  onRulesPanelExpandedChange: (expanded: boolean) => void;
  expandedRuleId: string | null;
  activeRuleId: string | null;
  onRuleExpand: (ruleId: string) => void;
  onRemovalModeToggle: (rule: SubredditRule) => void;
};

const filters: Array<{ id: QueueFilter; label: string; count: (stats: Stats) => number }> = [
  { id: 'all', label: 'All', count: (s) => s.total },
  { id: 'posts', label: 'Posts', count: (s) => s.posts },
  { id: 'comments', label: 'Comments', count: (s) => s.comments },
  { id: 'reported', label: 'Reported', count: (s) => s.reported },
];

const postKindFilters: Array<{ id: QueuePostKindFilter; label: string; count: (stats: PostKindStats) => number }> = [
  { id: 'all', label: 'All', count: (s) => s.text + s.image + s.video },
  { id: 'text', label: 'Text', count: (s) => s.text },
  { id: 'image', label: 'Image', count: (s) => s.image },
  { id: 'video', label: 'Video', count: (s) => s.video },
];

export function QueueToolbar({
  filter,
  postKindFilter,
  stats,
  postKindStats,
  isLoading,
  onFilterChange,
  onPostKindFilterChange,
  onRefresh,
  onNextComment,
  rules,
  rulesLoading,
  rulesPanelExpanded,
  onRulesPanelExpandedChange,
  expandedRuleId,
  activeRuleId,
  onRuleExpand,
  onRemovalModeToggle,
}: Props) {
  return (
    <aside className="filter-sidebar" aria-label="Queue controls">
      <section className="sidebar-panel sidebar-panel-queue">
        <div className="sidebar-panel-toolbar">
          <h2 className="sidebar-section-title">Queue</h2>
          <button
            type="button"
            className="sidebar-icon-button"
            onClick={onRefresh}
            disabled={isLoading}
            aria-label="Refresh queue"
            title="Refresh queue"
          >
            <RefreshCw size={15} className={isLoading ? 'spin' : ''} />
          </button>
          {stats.comments > 0 && onNextComment ? (
            <button
              type="button"
              className="sidebar-icon-button"
              onClick={onNextComment}
              aria-label="Next comment"
              title="Next comment"
            >
              <MessageCircle size={15} />
            </button>
          ) : null}
        </div>
        <nav className="queue-filters" role="tablist" aria-label="Filter queue">
          {filters.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={filter === entry.id}
              className={filter === entry.id ? 'active' : ''}
              data-filter={entry.id}
              onClick={() => onFilterChange(entry.id)}
            >
              <span className="queue-filter-label">{entry.label}</span>
              <span className="queue-filter-count">{entry.count(stats)}</span>
            </button>
          ))}
        </nav>

        {filter !== 'comments' ? (
          <nav className="queue-post-kind-filters" role="tablist" aria-label="Filter posts by type">
            {postKindFilters.map((entry) => (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={postKindFilter === entry.id}
                className={postKindFilter === entry.id ? 'active' : ''}
                data-post-kind={entry.id}
                onClick={() => onPostKindFilterChange(entry.id)}
              >
                <span className="queue-filter-label">{entry.label}</span>
                <span className="queue-filter-count">{entry.count(postKindStats)}</span>
              </button>
            ))}
          </nav>
        ) : null}
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
  );
}
