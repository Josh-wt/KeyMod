import { useEffect, useMemo, useState } from 'react';
import type { RemovalReason, SubredditRule } from '../../shared';
import { resolveRemovalReasonIndex } from '../ruleMode';

export type RemovalChoice = { id?: string; title?: string };

type Option = {
  key: string;
  reasonIndex: number;
  label: string;
  shortcut?: number;
  choice?: RemovalChoice;
};

type Props = {
  title: string;
  reasons: RemovalReason[];
  /** Subreddit rules, offered when no removal reasons are configured in settings. */
  rules?: SubredditRule[];
  asSpam?: boolean;
  /** Remove as soon as a reason is tapped, without a separate confirm step. */
  instant?: boolean;
  onCancel: () => void;
  onSubmit: (reasonIndex: number, choice?: RemovalChoice) => void;
};

export function RemovalReasonModal({ title, reasons, rules = [], asSpam = false, instant = false, onCancel, onSubmit }: Props) {
  const options = useMemo<Option[]>(() => {
    const configured = reasons.filter((reason) => reason.text.trim()).sort((a, b) => a.index - b.index);
    if (configured.length) {
      return configured.map((reason) => ({
        key: `reason:${reason.index}`,
        reasonIndex: reason.index,
        label: reason.text,
        shortcut: reason.index,
      }));
    }
    if (rules.length) {
      return rules.map((rule, position) => ({
        key: `rule:${rule.id}`,
        reasonIndex: resolveRemovalReasonIndex(rule, reasons),
        label: rule.shortName,
        shortcut: position < 9 ? position + 1 : undefined,
        choice: { id: rule.removalReasonId, title: rule.shortName },
      }));
    }
    return [{ key: 'none', reasonIndex: 1, label: 'Remove without a reason', shortcut: 1 }];
  }, [reasons, rules]);
  const [selectedKey, setSelectedKey] = useState(options[0].key);
  const selected = options.find((option) => option.key === selectedKey) ?? options[0];

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel();
      if (event.key >= '1' && event.key <= '9') {
        const option = options.find((entry) => entry.shortcut === Number(event.key));
        if (option) setSelectedKey(option.key);
      }
      if (event.key === 'Enter') onSubmit(selected.reasonIndex, selected.choice);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel, onSubmit, options, selected]);

  return (
    <div
      className="modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section className="modal removal-reason-modal" role="dialog" aria-modal="true" aria-label={title}>
        <h2>{title}</h2>
        <p className="modal-subtitle">
          {asSpam ? 'This removal will be marked as spam. ' : ''}
          {instant ? 'Tap a reason to remove. You can undo right after.' : 'One reason applies to everything being removed.'}
        </p>
        <div className="removal-reason-list">
          {options.map((option) => (
            <button
              key={option.key}
              type="button"
              className={!instant && selected.key === option.key ? 'active' : ''}
              onClick={() => {
                if (instant) onSubmit(option.reasonIndex, option.choice);
                else setSelectedKey(option.key);
              }}
            >
              {option.shortcut ? (
                <span className="removal-reason-index">
                  <kbd>{option.shortcut}</kbd>
                </span>
              ) : null}
              <span className="removal-reason-text">{option.label}</span>
            </button>
          ))}
        </div>
        <div className="modal-actions">
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          {instant ? null : (
            <button type="button" className="primary" onClick={() => onSubmit(selected.reasonIndex, selected.choice)}>
              Remove
            </button>
          )}
        </div>
        <div className="modal-hints">1–9 to pick a reason · Enter to confirm · Esc to cancel</div>
      </section>
    </div>
  );
}
