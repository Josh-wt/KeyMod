import { useEffect, useState } from 'react';
import { api } from '../api';

type Flair = { id: string; text?: string; name?: string };

type Props = {
  onCancel: () => void;
  onSelect: (flairId: string) => void;
};

export function FlairModal({ onCancel, onSelect }: Props) {
  const [flairs, setFlairs] = useState<Flair[]>([]);

  useEffect(() => {
    api.flairs().then((response) => setFlairs(response.flairs.slice(0, 9))).catch(() => setFlairs([]));
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel();
      if (event.key >= '1' && event.key <= '9') {
        const flair = flairs[Number(event.key) - 1];
        if (flair) onSelect(flair.id);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [flairs, onCancel, onSelect]);

  return (
    <div className="modal-backdrop">
      <section className="modal">
        <h2>Apply flair</h2>
        <div className="number-list">
          {flairs.map((flair, index) => (
            <button key={flair.id} onClick={() => onSelect(flair.id)}>
              [{index + 1}] {flair.text ?? flair.name ?? flair.id}
            </button>
          ))}
          {!flairs.length ? <p>No flairs available</p> : null}
        </div>
        <div className="modal-hints">Number to apply · Esc to cancel</div>
      </section>
    </div>
  );
}
