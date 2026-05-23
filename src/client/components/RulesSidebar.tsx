import { ChevronDown, ChevronRight, Scale } from 'lucide-react';
import type { SubredditRule } from '../../shared';

type Props = {
  rules: SubredditRule[];
  isLoading: boolean;
  panelExpanded: boolean;
  onPanelExpandedChange: (expanded: boolean) => void;
  expandedRuleId: string | null;
  activeRuleId: string | null;
  onRuleExpand: (ruleId: string) => void;
  onRemovalModeToggle: (rule: SubredditRule) => void;
};

function ruleKindLabel(kind: SubredditRule['kind']) {
  if (kind === 'link') return 'Posts';
  if (kind === 'comment') return 'Comments';
  return 'Posts & comments';
}

export function RulesSidebar({
  rules,
  isLoading,
  panelExpanded,
  onPanelExpandedChange,
  expandedRuleId,
  activeRuleId,
  onRuleExpand,
  onRemovalModeToggle,
}: Props) {
  return (
    <section className={`rules-sidebar${panelExpanded ? ' panel-expanded' : ''}`} aria-label="Subreddit rules">
      <button
        type="button"
        className="rules-sidebar-toggle"
        aria-expanded={panelExpanded}
        onClick={() => onPanelExpandedChange(!panelExpanded)}
      >
        <Scale size={14} aria-hidden="true" />
        <span>Rules</span>
        {panelExpanded ? <ChevronDown size={14} aria-hidden="true" /> : <ChevronRight size={14} aria-hidden="true" />}
      </button>

      {panelExpanded ? (
        <div className="rules-sidebar-body">
          {isLoading ? <p className="rules-sidebar-status">Loading rules…</p> : null}
          {!isLoading && !rules.length ? <p className="rules-sidebar-status">No subreddit rules found.</p> : null}
          {!isLoading && rules.length ? (
            <ul className="rules-sidebar-list">
              {rules.map((rule) => {
                const open = expandedRuleId === rule.id;
                const removalOn = activeRuleId === rule.id;
                return (
                  <li
                    key={rule.id}
                    className={`rules-sidebar-item${open ? ' open' : ''}${removalOn ? ' removal-on' : ''}`}
                  >
                    <button
                      type="button"
                      className="rules-sidebar-rule-header"
                      aria-expanded={open}
                      onClick={() => onRuleExpand(rule.id)}
                    >
                      <span className="rules-sidebar-rule-name">{rule.shortName}</span>
                      {removalOn ? <span className="rules-sidebar-rule-badge">On</span> : null}
                      <ChevronDown size={14} className="rules-sidebar-rule-chevron" aria-hidden="true" />
                    </button>
                    {open ? (
                      <div className="rules-sidebar-rule-details">
                        {rule.description ? <p className="rules-sidebar-rule-description">{rule.description}</p> : null}
                        <dl className="rules-sidebar-rule-meta">
                          <div>
                            <dt>Applies to</dt>
                            <dd>{ruleKindLabel(rule.kind)}</dd>
                          </div>
                          {rule.violationReason && rule.violationReason !== rule.shortName ? (
                            <div>
                              <dt>Report label</dt>
                              <dd>{rule.violationReason}</dd>
                            </div>
                          ) : null}
                        </dl>
                        <button
                          type="button"
                          className={`rules-removal-toggle${removalOn ? ' on' : ''}`}
                          aria-pressed={removalOn}
                          onClick={(event) => {
                            event.stopPropagation();
                            onRemovalModeToggle(rule);
                          }}
                        >
                          {removalOn ? 'Removal mode: On' : 'Turn on removal mode'}
                        </button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
