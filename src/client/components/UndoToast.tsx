import { useEffect, useState } from 'react';

type Props = {
  count: number;
  reason: string;
  countdown: number;
  onUndo: () => void;
  onDone: () => void;
};

export function UndoToast({ count, reason, countdown, onUndo, onDone }: Props) {
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
      <span>
        Removed {count} items with reason "{reason || 'No reason'}"
      </span>
      <button onClick={onUndo}>Backspace to undo</button>
      <strong>{remaining}s</strong>
    </div>
  );
}
