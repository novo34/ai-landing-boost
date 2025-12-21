'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import type { Components } from 'react-markdown';

interface MarkdownViewerProps {
  content: string;
}

export function MarkdownViewer({ content }: MarkdownViewerProps) {
  const components: Components = {
    h1: ({ children, ...props }: any) => {
      const id = typeof children === 'string'
        ? children.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
        : '';
      return (
        <h1 id={id} className="text-4xl font-bold mt-8 mb-4 border-b border-border pb-2 scroll-mt-20" {...props}>
          {children}
        </h1>
      );
    },
    h2: ({ children, ...props }: any) => {
      const id = typeof children === 'string'
        ? children.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
        : '';
      return (
        <h2 id={id} className="text-3xl font-bold mt-6 mb-3 border-b border-border pb-2 scroll-mt-20" {...props}>
          {children}
        </h2>
      );
    },
    h3: ({ children, ...props }: any) => {
      const id = typeof children === 'string'
        ? children.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
        : '';
      return (
        <h3 id={id} className="text-2xl font-semibold mt-4 mb-2 scroll-mt-20" {...props}>
          {children}
        </h3>
      );
    },
    h4: ({ children, ...props }: any) => {
      const id = typeof children === 'string'
        ? children.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
        : '';
      return (
        <h4 id={id} className="text-xl font-semibold mt-3 mb-2 scroll-mt-20" {...props}>
          {children}
        </h4>
      );
    },
    p: ({ ...props }) => (
      <p className="mb-4 leading-7" {...props} />
    ),
    ul: ({ ...props }) => (
      <ul className="list-disc pl-6 mb-4 space-y-2" {...props} />
    ),
    ol: ({ ...props }) => (
      <ol className="list-decimal pl-6 mb-4 space-y-2" {...props} />
    ),
    li: ({ ...props }) => (
      <li className="leading-7" {...props} />
    ),
    code: ({ inline, className, children, ...props }: any) => {
      if (inline) {
        return (
          <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
            {children}
          </code>
        );
      }
      return (
        <code className="block bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono mb-4" {...props}>
          {children}
        </code>
      );
    },
    pre: ({ ...props }) => (
      <pre className="bg-muted p-4 rounded-lg overflow-x-auto mb-4" {...props} />
    ),
    blockquote: ({ ...props }) => (
      <blockquote className="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground" {...props} />
    ),
    table: ({ ...props }) => (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full border-collapse border border-border" {...props} />
      </div>
    ),
    thead: ({ ...props }) => (
      <thead className="bg-muted" {...props} />
    ),
    th: ({ ...props }) => (
      <th className="border border-border px-4 py-2 text-left font-semibold" {...props} />
    ),
    td: ({ ...props }) => (
      <td className="border border-border px-4 py-2" {...props} />
    ),
    a: ({ ...props }) => (
      <a className="text-primary hover:underline" target="_blank" rel="noopener noreferrer" {...props} />
    ),
    hr: ({ ...props }) => (
      <hr className="my-8 border-t border-border" {...props} />
    ),
    strong: ({ ...props }) => (
      <strong className="font-semibold" {...props} />
    ),
    em: ({ ...props }) => (
      <em className="italic" {...props} />
    ),
  };

  return (
    <div className="prose prose-slate dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
