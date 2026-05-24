import { useEffect, useState } from 'react';

type Props = {
  count: number;
  reason: string;
  reasonIndex?: number;
  countdown: number;
  onUndo: () => void;
  onDone: () => void;
};

export function UndoToast({ count, reason, reasonIndex, countdown, onUndo, onDone }: Props) {
  const [remaining, setRemaining] = useState(countdown);

  useEffect(() => {
    setRemaining(countdown);
  }, [countdown]);

  useEffect(() => {
    if (remaining <= 0) {
      onDone();
      return undefined;
    }
    const timer = window.setInterval(() => setRemaining((value) => value - 1), 1000);
    return () => window.clearInterval(timer);
  }, [onDone, remaining]);

  return (
    <div className="undo-toast">
      <div className="undo-toast-info">
        <span className="undo-toast-count">
          Removed {count} {count === 1 ? 'item' : 'items'}
        </span>
        <span className="undo-toast-reason">
          {reasonIndex ? (
            <kbd className="undo-reason-key">Ctrl+{reasonIndex}</kbd>
          ) : null}
          <span className="undo-reason-label">{reason || 'No reason'}</span>
        </span>
      </div>
      <button onClick={onUndo}>Backspace to undo</button>
      <strong>{remaining}s</strong>
    </div>
  );
}
