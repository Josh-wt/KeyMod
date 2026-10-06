import { useState } from 'react';
import { Link2, X } from 'lucide-react';
import { parseThreadLink } from '../../threadLink';

type Props = { onOpen: (link: string) => Promise<void>; onClose: () => void };

export function ThreadLinkForm({ onOpen, onClose }: Props) {
  const [link, setLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  return (
    <form className="thread-link-form" onSubmit={async (event) => {
      event.preventDefault();
      if (loading) return;
      setError('');
      try {
        parseThreadLink(link);
        setLoading(true);
        await onOpen(link.trim());
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Could not open this thread.');
      } finally { setLoading(false); }
    }}>
      <label htmlFor="thread-link"><Link2 size={16} /> Reddit thread</label>
      <div className="thread-link-fields">
        <input id="thread-link" type="text" inputMode="url" autoFocus placeholder="Paste a Reddit thread link…" value={link}
          onChange={(event) => { setLink(event.target.value); setError(''); }}
          aria-describedby={error ? 'thread-link-error' : 'thread-link-hint'} aria-invalid={Boolean(error)} disabled={loading} />
        <button type="submit" disabled={loading || !link.trim()}>{loading ? 'Opening…' : 'Go to thread'}</button>
        <button type="button" className="thread-link-close" aria-label="Close thread link input" onClick={onClose} disabled={loading}><X size={16} /></button>
      </div>
      {error ? <p id="thread-link-error" className="thread-link-error" role="alert">{error}</p> :
        <p id="thread-link-hint">Open a post or comment permalink from this community inside KeyModerator.</p>}
    </form>
  );
}
