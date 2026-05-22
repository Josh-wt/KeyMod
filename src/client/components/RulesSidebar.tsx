import { ChevronDown, ChevronRight, Scale } from 'lucide-react';
import type { SubredditRule } from '../../shared';

type Props = {
  rules: SubredditRule[];
  isLoading: boolean;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  selectedRuleId: string | null;
  activeRuleId: string | null;
  onRuleClick: (rule: SubredditRule) => void;
};

export function RulesSidebar({
  rules,
  isLoading,
  expanded,
  onExpandedChange,
  selectedRuleId,
  activeRuleId,
  onRuleClick,
}: Props) {
  return (
    <section className={`rules-sidebar${expanded ? ' expanded' : ''}`} aria-label="Subreddit rules">
      <button
        type="button"
        className="rules-sidebar-toggle"
        aria-expanded={expanded}
        onClick={() => onExpandedChange(!expanded)}
      >
        <Scale size={14} />
        <span>Rules</span>
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>

      {expanded ? (
        <div className="rules-sidebar-body">
          {isLoading ? <p className="rules-sidebar-status">Loading rules…</p> : null}
          {!isLoading && !rules.length ? <p className="rules-sidebar-status">No subreddit rules found.</p> : null}
          {!isLoading
            ? rules.map((rule) => {
                const selected = selectedRuleId === rule.id;
                const active = activeRuleId === rule.id;
                return (
                  <button
                    key={rule.id}
                    type="button"
                    className={`rules-sidebar-rule${selected ? ' selected' : ''}${active ? ' active' : ''}`}
                    title={rule.description || rule.violationReason}
                    aria-pressed={active}
                    onClick={() => onRuleClick(rule)}
                  >
                    <span className="rules-sidebar-rule-name">{rule.shortName}</span>
                    {active ? (
                      <span className="rules-sidebar-rule-mode">Remove mode</span>
                    ) : selected ? (
                      <span className="rules-sidebar-rule-hint">Click again</span>
                    ) : null}
                  </button>
                );
              })
            : null}
        </div>
      ) : null}
    </section>
  );
}
