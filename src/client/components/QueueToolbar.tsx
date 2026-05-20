import { RefreshCw } from 'lucide-react';
import type { QueueFilter } from '../../shared';

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
};

const filters: Array<{ id: QueueFilter; label: string; count?: (stats: Stats) => number }> = [
  { id: 'all', label: 'All', count: (s) => s.total },
  { id: 'posts', label: 'Posts', count: (s) => s.posts },
  { id: 'comments', label: 'Comments', count: (s) => s.comments },
  { id: 'reported', label: 'Reported', count: (s) => s.reported },
];

export function QueueToolbar({ filter, stats, isLoading, onFilterChange, onRefresh }: Props) {
  return (
    <div className="queue-toolbar">
      <div className="queue-filters" role="tablist" aria-label="Queue filters">
        {filters.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={filter === entry.id}
            className={filter === entry.id ? 'active' : ''}
            onClick={() => onFilterChange(entry.id)}
          >
            {entry.label}
            <span>{entry.count?.(stats) ?? 0}</span>
          </button>
        ))}
      </div>
      <button type="button" className="queue-refresh" onClick={onRefresh} disabled={isLoading} aria-label="Refresh queue">
        <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
      </button>
    </div>
  );
}
