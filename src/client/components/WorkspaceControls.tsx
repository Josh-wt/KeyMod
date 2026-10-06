import { useEffect, useState } from 'react';
import { exitExpandedMode } from '@devvit/web/client';
import { Maximize, Minimize, ArrowUpRight, X } from 'lucide-react';
import { isRedditHost, isWorkspaceExpanded, openWorkspace } from '../workspaceMode';

export function WorkspaceControls({ onError }: { onError: (message: string) => void }) {
  const [expanded, setExpanded] = useState(isWorkspaceExpanded);
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement));
  useEffect(() => {
    const updateMode = () => setExpanded(isWorkspaceExpanded());
    const updateFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    window.addEventListener('focus', updateMode);
    // Reddit updates its mode before dispatching this notification.
    window.addEventListener('message', updateMode);
    document.addEventListener('fullscreenchange', updateFullscreen);
    return () => {
      window.removeEventListener('focus', updateMode);
      window.removeEventListener('message', updateMode);
      document.removeEventListener('fullscreenchange', updateFullscreen);
    };
  }, []);

  const reportError = (cause: unknown) => onError(cause instanceof Error ? cause.message : 'Could not change workspace view.');
  return (
    <nav className="workspace-controls" aria-label="Workspace window">
      {!expanded ? <button type="button" title="Open expanded workspace" aria-label="Open expanded workspace" onClick={(event) => {
        try { openWorkspace(event.nativeEvent); } catch (cause) { reportError(cause); }
      }}><ArrowUpRight size={16} /><span>Pop out</span></button> : null}
      {document.fullscreenEnabled ? <button type="button" title={fullscreen ? 'Exit full screen' : 'Full screen'} aria-label={fullscreen ? 'Exit full screen' : 'Full screen'} onClick={() => {
        const request = fullscreen ? document.exitFullscreen() : document.documentElement.requestFullscreen();
        void request.catch(() => onError('Full screen is unavailable in this browser view. Use the expanded workspace.'));
      }}>{fullscreen ? <Minimize size={16} /> : <Maximize size={16} />}</button> : null}
      {expanded && (isRedditHost() || window.opener) ? <button type="button" title="Close workspace" aria-label="Close workspace" onClick={(event) => {
        try {
          if (document.fullscreenElement) void document.exitFullscreen().catch(reportError);
          if (isRedditHost()) exitExpandedMode(event.nativeEvent);
          else window.close();
        } catch (cause) { reportError(cause); }
      }}><X size={16} /></button> : null}
    </nav>
  );
}
