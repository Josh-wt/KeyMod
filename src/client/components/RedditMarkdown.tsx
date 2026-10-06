import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Root, RootContent } from 'mdast';

// Reddit's ^(multiple words) and ^word notation is not part of CommonMark.
function redditSuperscript() {
  return (tree: Root) => {
    function walk(parent: { children: RootContent[] }) {
      parent.children = parent.children.flatMap((node): RootContent[] => {
        if ('children' in node) walk(node as { children: RootContent[] });
        if (node.type !== 'text' || !node.value.includes('^')) return [node];
        const parts: RootContent[] = [];
        let offset = 0;
        const pattern = /\^\(([^()\n]+)\)|\^([^\s^()]+)/g;
        for (const match of node.value.matchAll(pattern)) {
          const start = match.index!;
          if (start > offset) parts.push({ type: 'text', value: node.value.slice(offset, start) });
          parts.push({ type: 'text', value: match[1] ?? match[2], data: { hName: 'sup' } });
          offset = start + match[0].length;
        }
        if (!offset) return [node];
        if (offset < node.value.length) parts.push({ type: 'text', value: node.value.slice(offset) });
        return parts;
      });
    }
    walk(tree);
  };
}

export function RedditMarkdown({ children, className = '' }: { children: string; className?: string }) {
  return <div className={`reddit-markdown ${className}`}>
    <Markdown remarkPlugins={[remarkGfm, redditSuperscript]} skipHtml components={{
      a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer"
        onMouseDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()} />,
      img: ({ node: _node, ...props }) => <img {...props} loading="lazy" />,
    }}>{children}</Markdown>
  </div>;
}
