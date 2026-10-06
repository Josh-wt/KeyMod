import { useEffect, useState } from 'react';
import { Check, Share2 } from 'lucide-react';
import { redditPermalinkUrl } from '../permalink';

export function ShareButton({ permalink }: { permalink: string }) {
  const [copied, setCopied] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const url = redditPermalinkUrl(permalink);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2500);
    return () => window.clearTimeout(timer);
  }, [copied]);
  return <div className="share-control" onMouseDown={(event) => event.stopPropagation()}>
    <button type="button" className="share-button" aria-label={copied ? 'Link copied' : 'Copy Reddit link to share'}
      onClick={async (event) => {
        event.stopPropagation();
        try { await navigator.clipboard.writeText(url); setCopied(true); setShowLink(false); }
        catch { setShowLink((current) => !current); }
      }}>
      {copied ? <Check size={16} /> : <Share2 size={16} />}<span aria-live="polite">{copied ? 'Copied' : 'Share'}</span>
    </button>
    {showLink ? <label className="share-link-fallback">Copy this link
      <input aria-label="Reddit link to copy" readOnly value={url} autoFocus onFocus={(event) => event.target.select()} />
    </label> : null}
  </div>;
}
