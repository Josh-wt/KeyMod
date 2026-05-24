import { useEffect, useMemo, useState } from 'react';
import type { RemovalReason } from '../../shared';

type Props = {
  title: string;
  reasons: RemovalReason[];
  asSpam?: boolean;
  onCancel: () => void;
  onSubmit: (reasonIndex: number) => void;
};

export function RemovalReasonModal({ title, reasons, asSpam = false, onCancel, onSubmit }: Props) {
  const configured = useMemo(
    () => reasons.filter((reason) => reason.text.trim()).sort((a, b) => a.index - b.index),
    [reasons],
  );
  const [selected, setSelected] = useState(configured[0]?.index ?? 1);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel();
      if (event.key >= '1' && event.key <= '9') {
        const index = Number(event.key);
        if (configured.some((reason) => reason.index === index)) setSelected(index);
      }
      if (event.key === 'Enter' && configured.length) onSubmit(selected);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [configured, onCancel, onSubmit, selected]);

  return (
    <div className="modal-backdrop">
      <section className="modal removal-reason-modal">
        <h2>{title}</h2>
        {asSpam ? <p className="modal-subtitle">This removal will be marked as spam.</p> : null}
        <div className="removal-reason-list">
          {configured.length ? (
            configured.map((reason) => (
              <button
                key={reason.index}
                type="button"
                className={selected === reason.index ? 'active' : ''}
                onClick={() => setSelected(reason.index)}
              >
                <span className="removal-reason-index">
                  <kbd>Ctrl+{reason.index}</kbd>
                </span>
                <span className="removal-reason-text">{reason.text}</span>
              </button>
            ))
          ) : (
            <p className="modal-subtitle">No removal reasons configured in subreddit settings.</p>
          )}
        </div>
        <div className="modal-actions">
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="primary" disabled={!configured.length} onClick={() => onSubmit(selected)}>
            Remove
          </button>
        </div>
        <div className="modal-hints">1–9 to pick a reason · Enter to confirm · Esc to cancel</div>
      </section>
    </div>
  );
}
