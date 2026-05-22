import { RefreshCw } from 'lucide-react';
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
  rules: SubredditRule[];
  rulesLoading: boolean;
  rulesExpanded: boolean;
  onRulesExpandedChange: (expanded: boolean) => void;
  selectedRuleId: string | null;
  activeRuleId: string | null;
  onRuleClick: (rule: SubredditRule) => void;
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
  rules,
  rulesLoading,
  rulesExpanded,
  onRulesExpandedChange,
  selectedRuleId,
  activeRuleId,
  onRuleClick,
}: Props) {
  return (
    <aside className="filter-sidebar" aria-label="Queue controls">
      <RulesSidebar
        rules={rules}
        isLoading={rulesLoading}
        expanded={rulesExpanded}
        onExpandedChange={onRulesExpandedChange}
        selectedRuleId={selectedRuleId}
        activeRuleId={activeRuleId}
        onRuleClick={onRuleClick}
      />
      <button type="button" className="filter-sidebar-refresh" onClick={onRefresh} disabled={isLoading}>
        <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
        <span>Refresh</span>
      </button>
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
    </aside>
  );
}
