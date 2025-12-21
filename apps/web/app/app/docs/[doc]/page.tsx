'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { MarkdownViewer } from '@/components/docs/markdown-viewer';
import { DocsSearch } from '@/components/docs/docs-search';
import { DocsTableOfContents } from '@/components/docs/docs-table-of-contents';
import { DocsActions } from '@/components/docs/docs-actions';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/lib/i18n/client';

const docFiles: Record<string, string> = {
  'getting-started': '01-Getting-Started.md',
  'modules': '02-Modules.md',
  'workflows': '03-Workflows.md',
  'integrations': '04-Integrations.md',
  'troubleshooting': '05-Troubleshooting.md',
};

const defaultTitles: Record<string, string> = {
  'getting-started': 'Getting Started - AutomAI SaaS',
  'modules': 'Módulos del Sistema - AutomAI SaaS',
  'workflows': 'Flujos de Negocio - AutomAI SaaS',
  'integrations': 'Integraciones Externas - AutomAI SaaS',
  'troubleshooting': 'Troubleshooting - AutomAI SaaS',
};

export default function DocPage() {
  const { t } = useTranslation('common');
  const params = useParams();
  const docKey = params?.doc as string;
  const [content, setContent] = useState<string>('');
  const [filteredContent, setFilteredContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const docFile = docFiles[docKey] || '00-Overview.md';
  const docTitle = docKey 
    ? (t(`documentation.doc_titles.${docKey}`) || defaultTitles[docKey] || t('documentation.title'))
    : t('documentation.title');

  useEffect(() => {
    const loadDoc = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/docs/OWNER/${docFile}`);
        if (!response.ok) {
          throw new Error(t('documentation.load_failed'));
        }
        const text = await response.text();
        setContent(text);
        setFilteredContent(text);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('documentation.unknown_error'));
      } finally {
        setLoading(false);
      }
    };

    loadDoc();
  }, [docFile]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredContent(content);
      return;
    }

    const lines = content.split('\n');
    const filtered = lines.filter((line) =>
      line.toLowerCase().includes(query.toLowerCase())
    );

    if (filtered.length > 0) {
      const result: string[] = [];
      lines.forEach((line, index) => {
        if (line.toLowerCase().includes(query.toLowerCase())) {
          const start = Math.max(0, index - 2);
          const end = Math.min(lines.length, index + 3);
          result.push(...lines.slice(start, end));
          result.push('---');
        }
      });
      setFilteredContent(result.join('\n'));
    } else {
      setFilteredContent(content);
    }
  };

  const searchResultsCount = useMemo(() => {
    if (!searchQuery.trim()) return undefined;
    const matches = content.toLowerCase().match(new RegExp(searchQuery.toLowerCase(), 'g'));
    return matches ? matches.length : 0;
  }, [searchQuery, content]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
        <p className="text-destructive">{t('documentation.error')}: {error}</p>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Contenido principal */}
      <div className="flex-1">
        <DocsSearch onSearch={handleSearch} searchResults={searchResultsCount} />
        <DocsActions content={content} title={docTitle} />
        <div className="rounded-lg border bg-card p-6">
          <MarkdownViewer content={filteredContent} />
        </div>
      </div>
      
      {/* Índice lateral */}
      <DocsTableOfContents content={content} />
    </div>
  );
}
