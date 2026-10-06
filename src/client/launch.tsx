import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowUpRight } from 'lucide-react';
import { context } from '@devvit/web/client';
import { openWorkspace } from './workspaceMode';
import './styles/main.css';

function LaunchScreen() {
  const [error, setError] = useState('');
  return (
    <main className="launch-screen">
      <h1>KeyModerator</h1>
      <p className="launch-community">{context?.subredditName ? `r/${context.subredditName}` : 'Moderator workspace'}</p>
      <button type="button" className="launch-button" onClick={(event) => {
        setError('');
        try { openWorkspace(event.nativeEvent); }
        catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not open the workspace.'); }
      }}>Open KeyModerator <ArrowUpRight size={18} /></button>
      {error ? <p className="thread-link-error" role="alert">{error}</p> : null}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<LaunchScreen />);
