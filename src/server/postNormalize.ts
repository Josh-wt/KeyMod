import type { PostMediaKind } from '../shared';

type JsonRecord = Record<string, unknown>;

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function maybeUrl(value: unknown): string {
  const url = stringValue(value);
  if (!/^https?:\/\//i.test(url)) return '';
  return url;
}

function decodePreviewUrl(value: string): string {
  return value.replace(/&amp;/g, '&');
}

export function plainTextFromHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function bodyFromRaw(raw: JsonRecord): string {
  const body = stringValue(raw.body ?? raw.selftext);
  if (body) return body;
  const html = stringValue(raw.bodyHtml ?? raw.selftext_html ?? raw.selftextHtml);
  if (html) return plainTextFromHtml(html);
  return '';
}

function isRenderableThumbnail(url: string): boolean {
  return Boolean(url) && !['self', 'default', 'nsfw', 'spoiler', 'image'].includes(url);
}

function isVideoPostRaw(raw: JsonRecord): boolean {
  const secureMedia = raw.secureMedia as JsonRecord | undefined;
  if (secureMedia?.redditVideo) return true;
  const oembed = secureMedia?.oembed as JsonRecord | undefined;
  if (stringValue(oembed?.type).toLowerCase().includes('video')) return true;
  const url = maybeUrl(raw.url);
  if (url && /v\.redd\.it/i.test(url)) return true;
  return Boolean(raw.is_video ?? raw.isVideo);
}

export function postMediaKindFromRaw(raw: JsonRecord, previewUrl: string, thumbnail: string): PostMediaKind | undefined {
  if (isVideoPostRaw(raw)) return 'video';
  if (previewUrl || isRenderableThumbnail(thumbnail)) return 'image';
  const gallery = raw.gallery;
  if (Array.isArray(gallery) && gallery.length > 0) return 'image';
  return 'text';
}

export function previewUrlFromRaw(raw: JsonRecord): string {
  const preview = raw.preview as JsonRecord | undefined;
  const images = preview?.images as unknown[] | undefined;
  const first = images?.[0] as JsonRecord | undefined;
  const source = first?.source as JsonRecord | undefined;
  const previewSource = maybeUrl(source?.url);
  if (previewSource) return decodePreviewUrl(previewSource);

  const gallery = raw.gallery;
  if (Array.isArray(gallery) && gallery.length > 0) {
    const firstItem = gallery[0] as JsonRecord;
    const directGalleryUrl = maybeUrl(firstItem.url);
    if (directGalleryUrl) return decodePreviewUrl(directGalleryUrl);
    const galleryMedia = firstItem.media as JsonRecord | undefined;
    const galleryStill = galleryMedia?.s as JsonRecord | undefined;
    const galleryUrl = maybeUrl(galleryMedia?.url ?? galleryStill?.u);
    if (galleryUrl) return decodePreviewUrl(galleryUrl);
  } else {
    const galleryRecord = gallery as JsonRecord | undefined;
    const galleryItems = galleryRecord?.items as unknown[] | undefined;
    const galleryMedia = (galleryItems?.[0] as JsonRecord | undefined)?.media as JsonRecord | undefined;
    const galleryStill = galleryMedia?.s as JsonRecord | undefined;
    const galleryUrl = maybeUrl(galleryMedia?.url ?? galleryStill?.u);
    if (galleryUrl) return decodePreviewUrl(galleryUrl);
  }

  const secureMedia = raw.secureMedia as JsonRecord | undefined;
  const redditVideo = secureMedia?.redditVideo as JsonRecord | undefined;
  const videoPoster = maybeUrl(redditVideo?.scrubberMediaUrl ?? redditVideo?.fallbackUrl);
  if (videoPoster && /\.(gif|jpe?g|png|webp)$/i.test(videoPoster)) return videoPoster;

  const overridden = maybeUrl(raw.url_overridden_by_dest);
  if (overridden && /\.(gif|jpe?g|png|webp)$/i.test(overridden)) return overridden;

  const directUrl = maybeUrl(raw.url);
  if (directUrl && /\.(gif|jpe?g|png|webp)$/i.test(directUrl)) return directUrl;

  const thumb = maybeUrl(raw.thumbnailUrl ?? raw.thumbnail);
  if (isRenderableThumbnail(thumb)) return thumb;

  return '';
}
