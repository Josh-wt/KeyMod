import { useEffect, useState } from 'react';

const TOUCH_UI_QUERY = '(max-width: 720px), (pointer: coarse)';

/** True on phones and other touch-first screens, where keyboard shortcuts are unavailable. */
export function useTouchUi() {
  const [touchUi, setTouchUi] = useState(() => window.matchMedia(TOUCH_UI_QUERY).matches);

  useEffect(() => {
    const media = window.matchMedia(TOUCH_UI_QUERY);
    const update = () => setTouchUi(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  // Menus and sheets are portalled to <body>, so the flag lives on the root element.
  useEffect(() => {
    document.documentElement.classList.toggle('touch-ui', touchUi);
    return () => document.documentElement.classList.remove('touch-ui');
  }, [touchUi]);

  return touchUi;
}
