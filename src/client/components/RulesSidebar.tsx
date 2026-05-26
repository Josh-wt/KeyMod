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
    <section
      className={`sidebar-panel sidebar-panel-rules${panelExpanded ? ' is-expanded' : ''}`}
      aria-label="Removal rules"
    >
      <button
        type="button"
        className="sidebar-panel-heading"
        aria-expanded={panelExpanded}
        onClick={() => onPanelExpandedChange(!panelExpanded)}
      >
        <span className="sidebar-panel-heading-label">
          <Scale size={14} aria-hidden="true" />
          <span>Removal rules</span>
        </span>
        {panelExpanded ? <ChevronDown size={14} aria-hidden="true" /> : <ChevronRight size={14} aria-hidden="true" />}
      </button>

      {panelExpanded ? (
        <div className="sidebar-panel-body">
          {isLoading ? <p className="sidebar-panel-hint">Loading rules…</p> : null}
          {!isLoading && !rules.length ? <p className="sidebar-panel-hint">No subreddit rules found.</p> : null}
          {!isLoading && rules.length ? (
            <>
              <p className="sidebar-panel-hint">Expand a rule to turn on removal mode, then select items in the queue.</p>
              <ul className="rules-list">
                {rules.map((rule) => {
                  const open = expandedRuleId === rule.id;
                  const removalOn = activeRuleId === rule.id;
                  return (
                    <li
                      key={rule.id}
                      className={`rules-list-item${open ? ' is-open' : ''}${removalOn ? ' is-active' : ''}`}
                    >
                      <button
                        type="button"
                        className="rules-list-trigger"
                        aria-expanded={open}
                        onClick={() => onRuleExpand(rule.id)}
                      >
                        <span className="rules-list-name">{rule.shortName}</span>
                        {removalOn ? <span className="rules-list-badge">Active</span> : null}
                        <ChevronDown size={14} className="rules-list-chevron" aria-hidden="true" />
                      </button>
                      {open ? (
                        <div className="rules-list-details">
                          {rule.description ? <p className="rules-list-description">{rule.description}</p> : null}
                          <dl className="rules-list-meta">
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
                            {removalOn ? 'Removal mode on' : 'Use this rule'}
                          </button>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
