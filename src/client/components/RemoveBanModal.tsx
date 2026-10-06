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

/** Reddit rejects ban reasons longer than this. */
const BAN_REASON_MAX = 100;

export function RemoveBanModal({ itemCount, usernames, reasons, rules, onCancel, onSubmit }: Props) {
  const options = useMemo(() => removalOptions(reasons, rules), [reasons, rules]);
  // Ban reasons are the subreddit's rules; without any, the removal reasons stand in.
  const banOptions = useMemo(
    () => (rules.length ? rules.map((rule) => rule.shortName) : options.map((option) => option.label)),
    [options, rules],
  );
  // Nothing is preselected: both reasons are the moderator's call.
  const [removalKey, setRemovalKey] = useState<string | null>(null);
  const [banIndex, setBanIndex] = useState<number | null>(null);
  const removal = options.find((option) => option.key === removalKey);
  const banReason = banIndex === null ? null : banOptions[banIndex].slice(0, BAN_REASON_MAX);
  const submit = () => {
    if (removal && banReason !== null) onSubmit(removal.reasonIndex, removal.choice, banReason);
  };
  const users = usernames.length === 1 ? `u/${usernames[0]}` : `${usernames.length} users`;
  const items = itemCount === 1 ? '1 item' : `${itemCount} items`;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel();
      if (event.key === 'Enter') submit();
      // event.code, because Shift turns the digit keys into symbols.
      const digit = /^(?:Digit|Numpad)(\d)$/.exec(event.code)?.[1];
      if (!digit || event.ctrlKey || event.metaKey || event.altKey) return;
      event.preventDefault();
      if (event.shiftKey) {
        if (banOptions[Number(digit) - 1]) setBanIndex(Number(digit) - 1);
      } else {
        const option = options.find((entry) => entry.shortcut === Number(digit));
        if (option) setRemovalKey(option.key);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [banOptions, banReason, onCancel, onSubmit, options, removal]);

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
        {usernames.length > 1 ? <p className="modal-subtitle ban-targets">{usernames.map((name) => `u/${name}`).join(', ')}</p> : null}
        <div className="remove-ban-columns">
          <div>
            <h3>Removal reason</h3>
            <div className="removal-reason-list">
              {options.map((option) => (
                <button key={option.key} type="button" className={removal?.key === option.key ? 'active' : ''} onClick={() => setRemovalKey(option.key)}>
                  <span className="removal-reason-index">{option.shortcut ? <kbd>{option.shortcut}</kbd> : null}</span>
                  <span className="removal-reason-text">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3>Ban reason</h3>
            <div className="removal-reason-list">
              {banOptions.map((label, position) => (
                <button key={position} type="button" className={banIndex === position ? 'active' : ''} onClick={() => setBanIndex(position)}>
                  <span className="removal-reason-index">{position < 9 ? <kbd>⇧{position + 1}</kbd> : null}</span>
                  <span className="removal-reason-text">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="primary danger" disabled={!removal || banReason === null} onClick={submit}>
            Remove and ban
          </button>
        </div>
      </section>
    </div>
  );
}
