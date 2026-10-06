import { useEffect, useState } from 'react';

type Props = {
  username: string;
  onCancel: () => void;
  onSubmit: (note: string) => void;
};

export function NoteModal({ username, onCancel, onSubmit }: Props) {
  const [note, setNote] = useState('');

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel();
      if (event.key === 'Enter' && note.trim()) onSubmit(note.trim());
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [note, onCancel, onSubmit]);

  return (
    <div
      className="modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section className="modal">
        <h2>Mod note for u/{username}</h2>
        <label>
          Note
          <input autoFocus value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
        <div className="modal-actions">
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="primary" disabled={!note.trim()} onClick={() => onSubmit(note.trim())}>
            Save note
          </button>
        </div>
        <div className="modal-hints">Enter to save · Esc to cancel</div>
      </section>
    </div>
  );
}
