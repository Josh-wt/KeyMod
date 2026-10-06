import { useEffect, useMemo, useState } from 'react';
import type { RemovalReason, SubredditRule } from '../../shared';
import { removalOptions, type RemovalChoice } from './RemovalReasonModal';

type Props = {
  itemCount: number;
  usernames: string[];
  reasons: RemovalReason[];
  rules: SubredditRule[];
  onCancel: () => void;
  onSubmit: (reasonIndex: number, choice: RemovalChoice | undefined, banReason: string) => void;
};

const SAME_AS_REMOVAL = 'same';
/** Reddit rejects ban reasons longer than this. */
const BAN_REASON_MAX = 100;

export function RemoveBanModal({ itemCount, usernames, reasons, rules, onCancel, onSubmit }: Props) {
  const options = useMemo(() => removalOptions(reasons, rules), [reasons, rules]);
  const [removalKey, setRemovalKey] = useState(options[0].key);
  const [banKey, setBanKey] = useState(SAME_AS_REMOVAL);
  const removal = options.find((option) => option.key === removalKey) ?? options[0];
  const banRule = rules.find((rule) => rule.id === banKey);
  const banReason = (banRule?.shortName ?? (removal.key === 'none' ? '' : removal.label)).slice(0, BAN_REASON_MAX);
  const users = usernames.length === 1 ? `u/${usernames[0]}` : `${usernames.length} users`;
  const items = itemCount === 1 ? '1 item' : `${itemCount} items`;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel();
      if (event.key === 'Enter') onSubmit(removal.reasonIndex, removal.choice, banReason);
      // event.code, because Shift turns the digit keys into symbols.
      const digit = /^(?:Digit|Numpad)(\d)$/.exec(event.code)?.[1];
      if (!digit || event.ctrlKey || event.metaKey || event.altKey) return;
      event.preventDefault();
      if (event.shiftKey) {
        if (digit === '0') setBanKey(SAME_AS_REMOVAL);
        else if (rules[Number(digit) - 1]) setBanKey(rules[Number(digit) - 1].id);
      } else {
        const option = options.find((entry) => entry.shortcut === Number(digit));
        if (option) setRemovalKey(option.key);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [banReason, onCancel, onSubmit, options, removal, rules]);

  return (
    <div
      className="modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section className="modal removal-reason-modal remove-ban-modal" role="dialog" aria-modal="true" aria-label="Remove and ban">
        <h2>
          Remove {items} and ban {users}
        </h2>
        <p className="modal-subtitle ban-targets">
          Permanent ban{usernames.length > 1 ? `: ${usernames.map((name) => `u/${name}`).join(', ')}` : ''}
        </p>
        <div className="remove-ban-columns">
          <div>
            <h3>Removal reason</h3>
            <div className="removal-reason-list">
              {options.map((option) => (
                <button key={option.key} type="button" className={removal.key === option.key ? 'active' : ''} onClick={() => setRemovalKey(option.key)}>
                  <span className="removal-reason-index">{option.shortcut ? <kbd>{option.shortcut}</kbd> : null}</span>
                  <span className="removal-reason-text">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3>Ban reason</h3>
            <div className="removal-reason-list">
              <button type="button" className={banRule ? '' : 'active'} onClick={() => setBanKey(SAME_AS_REMOVAL)}>
                <span className="removal-reason-index">
                  <kbd>⇧0</kbd>
                </span>
                <span className="removal-reason-text">Same as removal reason</span>
              </button>
              {rules.map((rule, position) => (
                <button key={rule.id} type="button" className={banRule?.id === rule.id ? 'active' : ''} onClick={() => setBanKey(rule.id)}>
                  <span className="removal-reason-index">{position < 9 ? <kbd>⇧{position + 1}</kbd> : null}</span>
                  <span className="removal-reason-text">{rule.shortName}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="primary danger" onClick={() => onSubmit(removal.reasonIndex, removal.choice, banReason)}>
            Remove and ban
          </button>
        </div>
        <div className="modal-hints">1–9 removal reason · Shift+1–9 ban reason · Enter to confirm · Esc to cancel</div>
      </section>
    </div>
  );
}
