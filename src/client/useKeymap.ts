import { useEffect, useRef, useState } from 'react';
import { api } from './api';
import { actionForKey, isUndoKey } from './keyBinding';
import { DEFAULT_KEYMAP, detectKeyConflicts } from '../settings';
import type { AppSettings, KeyAction } from '../shared';

export function useKeymap(
  dispatch: (action: KeyAction) => void | Promise<void>,
  handleRemove: (index: number) => void,
  handleBanReason: (index: number) => void,
  isModalOpen: boolean,
  addToast: (message: string, kind?: 'info' | 'warning' | 'error' | 'success', persistent?: boolean) => void,
  onClearSelection?: () => void,
  undoAvailable = false,
) {
  const [settings, setSettings] = useState<AppSettings>({
    keymap: DEFAULT_KEYMAP,
    removalReasons: Array.from({ length: 9 }, (_, index) => ({ index: index + 1, text: '', flairId: '' })),
    conflicts: [],
  });

  useEffect(() => {
    api
      .settings()
      .then((loaded) => {
        const conflicts = detectKeyConflicts(loaded.keymap);
        setSettings({ ...loaded, conflicts });
        for (const conflict of conflicts) {
          console.warn(`Key conflict in settings: ${conflict.actions.join(', ')} mapped to ${conflict.key}`);
          addToast(`Key conflict in settings: two actions mapped to '${conflict.key}'. Check mod settings.`, 'warning', true);
        }
      })
      .catch(() => {
        addToast('Settings failed to load. Using default keyboard bindings.', 'warning');
      });
  }, [addToast]);

  // Refs, not effect locals: the chord toast re-renders the app and re-runs the keydown effect.
  const banChordActiveRef = useRef(false);
  const banChordTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (banChordTimerRef.current !== null) window.clearTimeout(banChordTimerRef.current);
    };
  }, []);

  useEffect(() => {
    function armBanChord() {
      banChordActiveRef.current = true;
      if (banChordTimerRef.current !== null) window.clearTimeout(banChordTimerRef.current);
      banChordTimerRef.current = window.setTimeout(() => {
        banChordActiveRef.current = false;
        banChordTimerRef.current = null;
      }, 2500);
    }

    function onKeyDown(e: KeyboardEvent) {
      const activeTag = document.activeElement?.tagName;
      if (isModalOpen || activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

      if (e.key === 'Escape' && onClearSelection) {
        onClearSelection();
        return;
      }

      if (e.ctrlKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        armBanChord();
        addToast('Ban reason mode: press 1-9.', 'info');
        return;
      }

      if (banChordActiveRef.current && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        banChordActiveRef.current = false;
        if (banChordTimerRef.current !== null) {
          window.clearTimeout(banChordTimerRef.current);
          banChordTimerRef.current = null;
        }
        handleBanReason(parseInt(e.key, 10));
        return;
      }

      if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        handleRemove(parseInt(e.key, 10));
        return;
      }

      if (undoAvailable && isUndoKey(e)) {
        e.preventDefault();
        void dispatch('undo');
        return;
      }

      const action = actionForKey(settings.keymap, e) as KeyAction | undefined;
      if (action) {
        e.preventDefault();
        void dispatch(action);
      }
    }

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [addToast, dispatch, handleBanReason, handleRemove, isModalOpen, onClearSelection, settings.keymap, undoAvailable]);

  return settings;
}
