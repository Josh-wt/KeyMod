import { useEffect, useState } from 'react';

type Props = {
  username: string;
  onCancel: () => void;
  onSubmit: (duration: number | 'permanent', reason: string) => void;
};

const durations: Array<{ label: string; value: number | 'permanent' }> = [
  { label: '1 day', value: 1 },
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: 'Permanent', value: 'permanent' },
];

export function BanModal({ username, onCancel, onSubmit }: Props) {
  const [selected, setSelected] = useState(1);
  const [reason, setReason] = useState('');

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key >= '1' && event.key <= '4') setSelected(Number(event.key));
      if (event.key === 'Escape') onCancel();
      if (event.key === 'Enter') onSubmit(durations[selected - 1].value, reason);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel, onSubmit, reason, selected]);

  return (
    <div className="modal-backdrop">
      <section className="modal">
        <h2>Ban u/{username}</h2>
        <div className="duration-grid">
          {durations.map((duration, index) => (
            <button
              key={duration.label}
              className={selected === index + 1 ? 'active' : ''}
              onClick={() => setSelected(index + 1)}
            >
              [{index + 1}] {duration.label}
            </button>
          ))}
        </div>
        <label>
          Reason
          <input autoFocus value={reason} onChange={(event) => setReason(event.target.value)} />
        </label>
        <div className="modal-hints">Enter to confirm · Esc to cancel</div>
      </section>
    </div>
  );
}
