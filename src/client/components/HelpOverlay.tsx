import { useEffect } from 'react';
import type { Keymap } from '../../shared';

type Props = {
  keymap: Keymap;
  onClose: () => void;
};

export function HelpOverlay({ keymap, onClose }: Props) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === '?' || event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="help-overlay">
      <section>
        <h2>Keybindings</h2>
        <div className="help-grid">
          {Object.entries(keymap).map(([action, key]) => (
            <div key={action}>
              <kbd>{key === ' ' ? 'Space' : key}</kbd>
              <span>{action}</span>
            </div>
          ))}
          <div>
            <kbd>Ctrl+1-9</kbd>
            <span>remove with reason</span>
          </div>
        </div>
      </section>
    </div>
  );
}
