import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { RedditMarkdown } from '../src/client/components/RedditMarkdown';

const render = (text: string) => renderToStaticMarkup(<RedditMarkdown>{text}</RedditMarkdown>);

test('renders the screenshot comment with separate paragraphs and Reddit superscript', () => {
  const html = render('Yay\n\n^(Finished in 2 guesses! 🟧🟩)');
  assert.match(html, /<p>Yay<\/p>/);
  assert.match(html, /<sup>Finished in 2 guesses! 🟧🟩<\/sup>/);
  assert.doesNotMatch(html, /\^\(/);
});

test('preserves code while rendering common post formatting', () => {
  const html = render('**bold** and *italic* and ~~removed~~\n\n`^(literal code)`\n\n> quoted reply');
  assert.match(html, /<strong>bold<\/strong>/);
  assert.match(html, /<em>italic<\/em>/);
  assert.match(html, /<del>removed<\/del>/);
  assert.match(html, /<code>\^\(literal code\)<\/code>/);
  assert.match(html, /<blockquote>/);
});

test('user-supplied HTML and executable link URLs are not rendered as active content', () => {
  const html = render('<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">\n\n[click](javascript:alert%281%29)');
  assert.doesNotMatch(html, /<script|onerror=|href="javascript:/);
});

test('normal Reddit links remain usable and isolated from the opener', () => {
  const html = render('[thread](https://www.reddit.com/r/example/comments/abc123/)');
  assert.match(html, /href="https:\/\/www.reddit.com\/r\/example\/comments\/abc123\/"/);
  assert.match(html, /rel="noopener noreferrer"/);
});
