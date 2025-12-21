'use client';

import { useEffect, useState, useMemo } from 'react';
import { MarkdownViewer } from '@/components/docs/markdown-viewer';
import { DocsSearch } from '@/components/docs/docs-search';
import { DocsTableOfContents } from '@/components/docs/docs-table-of-contents';
import { DocsActions } from '@/components/docs/docs-actions';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/lib/i18n/client';

export default function DocsPage() {
  const { t } = useTranslation('common');
  const [content, setContent] = useState<string>('');
  const [filteredContent, setFilteredContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadDoc = async () => {
      try {
        setLoading(true);
        const response = await fetch('/docs/OWNER/00-Overview.md');
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
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredContent(content);
      return;
    }

    // Búsqueda simple: filtrar líneas que contengan el query
    const lines = content.split('\n');
    const filtered = lines.filter((line) =>
      line.toLowerCase().includes(query.toLowerCase())
    );

    if (filtered.length > 0) {
      // Mostrar contexto alrededor de las líneas encontradas
      const result: string[] = [];
      lines.forEach((line, index) => {
        if (line.toLowerCase().includes(query.toLowerCase())) {
          // Agregar líneas anteriores y siguientes para contexto
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
        <Skeleton className="h-4 w-3/4" />
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
        <DocsActions content={content} title="Overview - AutomAI SaaS" />
        <div className="rounded-lg border bg-card p-6">
          <MarkdownViewer content={filteredContent} />
        </div>
      </div>
      
      {/* Índice lateral */}
      <DocsTableOfContents content={content} />
    </div>
  );
}
