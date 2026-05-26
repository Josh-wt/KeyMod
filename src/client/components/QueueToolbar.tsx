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

export function QueueToolbar({
  filter,
  stats,
  isLoading,
  onFilterChange,
  onRefresh,
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
