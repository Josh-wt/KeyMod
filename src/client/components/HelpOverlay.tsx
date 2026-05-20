import { useEffect } from 'react';
import type { Keymap } from '../../shared';

type Props = {
  keymap: Keymap;
  onClose: () => void;
};

const LABELS: Partial<Record<keyof Keymap, string>> = {
  approve: 'Approve item(s)',
  ban: 'Ban author (opens modal)',
  lock: 'Lock / unlock',
  flair: 'Edit post flair',
  note: 'Add mod note',
  user: 'User history panel',
  next: 'Next item',
  prev: 'Previous item',
  select: 'Toggle selection',
  undo: 'Undo last removal',
  help: 'This help',
  spam: 'Remove as spam',
  view: 'Open on Reddit',
  nsfw: 'Toggle NSFW',
  spoiler: 'Toggle spoiler',
  sticky: 'Toggle highlight / sticky',
  distinguish: 'Distinguish as mod',
  ignoreReports: 'Ignore / unignore reports',
  refresh: 'Refresh queue',
  selectAll: 'Select all visible',
  mute: 'Mute author',
};

function formatKey(key: string) {
  if (key === ' ') return 'Space';
  return key;
}

export function HelpOverlay({ keymap, onClose }: Props) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === '?' || event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="help-overlay" role="dialog" aria-label="Keyboard shortcuts">
      <section className="help-panel">
        <header className="help-header">
          <h2>KeyModerator shortcuts</h2>
          <p>Toolbox-style mod queue. Configure bindings in subreddit app settings.</p>
        </header>

        <div className="help-grid">
          {Object.entries(keymap).map(([action, key]) => (
            <div key={action}>
              <kbd>{formatKey(key)}</kbd>
              <span>{LABELS[action as keyof Keymap] ?? action}</span>
            </div>
          ))}
        </div>

        <section className="help-section">
          <h3>Chords</h3>
          <div className="help-grid">
            <div>
              <kbd>Ctrl+1-9</kbd>
              <span>Remove with removal reason</span>
            </div>
            <div>
              <kbd>Ctrl+B</kbd> then <kbd>1-9</kbd>
              <span>Ban with preset reason</span>
            </div>
            <div>
              <kbd>Ctrl+K</kbd>
              <span>Command palette</span>
            </div>
            <div>
              <kbd>Esc</kbd>
              <span>Clear selection</span>
            </div>
          </div>
        </section>

        <section className="help-section">
          <h3>Selection</h3>
          <p>Drag across rows or shift-select text to batch. Actions apply to selection, or the focused row if nothing is selected.</p>
        </section>
      </section>
    </div>
  );
}
