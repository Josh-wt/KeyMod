import { MessageCircle, RefreshCw } from 'lucide-react';
import type { QueueFilter, SubredditRule } from '../../shared';
import { RulesSidebar } from './RulesSidebar';

type Stats = {
  total: number;
  posts: number;
  comments: number;
  reported: number;
};

type Props = {
  filter: QueueFilter;
  stats: Stats;
  isLoading: boolean;
  onFilterChange: (filter: QueueFilter) => void;
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

const filters: Array<{ id: QueueFilter; label: string; count?: (stats: Stats) => number }> = [
  { id: 'all', label: 'All', count: (s) => s.total },
  { id: 'posts', label: 'Posts', count: (s) => s.posts },
  { id: 'comments', label: 'Comments', count: (s) => s.comments },
  { id: 'reported', label: 'Reported', count: (s) => s.reported },
];

export function QueueToolbar({
  filter,
  stats,
  isLoading,
  onFilterChange,
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
        <button type="button" className="filter-sidebar-refresh" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
        {stats.comments > 0 && onNextComment ? (
          <button type="button" className="filter-sidebar-refresh next-comment-button" onClick={onNextComment}>
            <MessageCircle size={16} />
            <span>Next comment</span>
          </button>
        ) : null}
        <div className="queue-filters" role="tablist" aria-label="Queue filters">
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
              {entry.label}
              <span>{entry.count?.(stats) ?? 0}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
