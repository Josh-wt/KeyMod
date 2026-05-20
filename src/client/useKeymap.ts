import { useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { DEFAULT_KEYMAP, detectKeyConflicts } from '../settings';
import type { AppSettings, KeyAction, Keymap } from '../shared';

export function useKeymap(
  dispatch: (action: KeyAction) => void,
  handleRemove: (index: number) => void,
  handleBanReason: (index: number) => void,
  isModalOpen: boolean,
  addToast: (message: string, kind?: 'info' | 'warning' | 'error' | 'success', persistent?: boolean) => void,
) {
  const [settings, setSettings] = useState<AppSettings>({
    keymap: DEFAULT_KEYMAP,
    removalReasons: Array.from({ length: 9 }, (_, index) => ({ index: index + 1, text: '', flairId: '' })),
    banReasons: Array.from({ length: 9 }, (_, index) => ({ index: index + 1, reason: '', message: '', note: '', duration: 0 })),
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

  const keyToAction = useMemo(() => {
    return Object.entries(settings.keymap).reduce<Record<string, KeyAction>>((acc, [action, key]) => {
      acc[key] = action as KeyAction;
      return acc;
    }, {});
  }, [settings.keymap]);

  useEffect(() => {
    let banChordActive = false;
    let banChordTimer: number | null = null;

    function armBanChord() {
      banChordActive = true;
      if (banChordTimer !== null) window.clearTimeout(banChordTimer);
      banChordTimer = window.setTimeout(() => {
        banChordActive = false;
        banChordTimer = null;
      }, 2500);
    }

    function onKeyDown(e: KeyboardEvent) {
      const activeTag = document.activeElement?.tagName;
      if (isModalOpen || activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

      if (e.ctrlKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        armBanChord();
        addToast('Ban reason mode: press 1-9.', 'info');
        return;
      }

      if (banChordActive && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        banChordActive = false;
        if (banChordTimer !== null) {
          window.clearTimeout(banChordTimer);
          banChordTimer = null;
        }
        handleBanReason(parseInt(e.key, 10));
        return;
      }

      if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        handleRemove(parseInt(e.key, 10));
        return;
      }

      const action = keyToAction[e.key as keyof Keymap];
      if (action) {
        e.preventDefault();
        dispatch(action);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (banChordTimer !== null) window.clearTimeout(banChordTimer);
    };
  }, [addToast, dispatch, handleBanReason, handleRemove, isModalOpen, keyToAction]);

  return settings;
}
