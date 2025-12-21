'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, Clock, MessageSquare, Calendar, User, BookOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiClient } from '@/lib/api/client';
import { useTranslation } from '@/lib/i18n/client';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

interface SearchResult {
  id: string;
  type: string;
  title: string;
  description?: string;
  preview?: string;
  url: string;
}

const SEARCH_HISTORY_KEY = 'search_history';
const MAX_HISTORY = 10;

const typeIcons: Record<string, React.ReactNode> = {
  conversation: <MessageSquare className="h-4 w-4" />,
  message: <MessageSquare className="h-4 w-4" />,
  appointment: <Calendar className="h-4 w-4" />,
  agent: <User className="h-4 w-4" />,
  knowledge_collection: <BookOpen className="h-4 w-4" />,
  knowledge_source: <BookOpen className="h-4 w-4" />,
};

export function GlobalSearch() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    conversations: SearchResult[];
    messages: SearchResult[];
    appointments: SearchResult[];
    agents: SearchResult[];
    knowledge: SearchResult[];
    total: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Cargar historial desde localStorage
    const savedHistory = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        // Ignorar error
      }
    }

    // Atajo de teclado Ctrl+K / Cmd+K
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      performSearch(query);
    }, 300); // Debounce 300ms

    return () => clearTimeout(timeoutId);
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    setLoading(true);
    try {
      const response = await apiClient.search(searchQuery);
      if (response.success && response.data) {
        setResults({
          conversations: response.data.results.conversations,
          messages: response.data.results.messages,
          appointments: response.data.results.appointments,
          agents: response.data.results.agents,
          knowledge: response.data.results.knowledge,
          total: response.data.total,
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (url: string) => {
    // Guardar en historial
    if (query && !history.includes(query)) {
      const newHistory = [query, ...history].slice(0, MAX_HISTORY);
      setHistory(newHistory);
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
    }

    setOpen(false);
    setQuery('');
    router.push(url);
  };

  const handleHistoryClick = (historyQuery: string) => {
    setQuery(historyQuery);
    performSearch(historyQuery);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      conversation: t('search.types.conversation'),
      message: t('search.types.message'),
      appointment: t('search.types.appointment'),
      agent: t('search.types.agent'),
      knowledge_collection: t('search.types.knowledge_collection'),
      knowledge_source: t('search.types.knowledge_source'),
    };
    return labels[type] || type;
  };

  const renderResults = (items: SearchResult[], label: string) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-4">
        <h3 className="text-sm font-medium mb-2">
          {label} ({items.length})
        </h3>
        <div className="space-y-1">
          {items.map(result => (
            <button
              key={result.id}
              onClick={() => handleResultClick(result.url)}
              className="w-full text-left px-3 py-2 rounded hover:bg-accent flex items-start gap-2 group"
            >
              <span className="text-muted-foreground mt-0.5 flex-shrink-0">
                {typeIcons[result.type] || <Search className="h-4 w-4" />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{result.title}</p>
                {result.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{result.description}</p>
                )}
                {result.preview && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {result.preview}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <Button
        variant="outline"
        className="relative w-full justify-start text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span>{t('search.placeholder')}</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl p-0">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle>{t('search.title')}</DialogTitle>
          </DialogHeader>
          <div className="px-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={t('search.input_placeholder')}
                className="pl-10"
              />
              {query && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setQuery('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="mt-4 max-h-[400px] overflow-y-auto px-4 pb-4">
            {!query && history.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium">{t('search.recent')}</h3>
                  <Button variant="ghost" size="sm" onClick={clearHistory}>
                    {t('search.clear_history')}
                  </Button>
                </div>
                <div className="space-y-1">
                  {history.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleHistoryClick(item)}
                      className="w-full text-left px-3 py-2 rounded hover:bg-accent flex items-center gap-2"
                    >
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{item}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loading && (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            )}

            {!loading && query && results && results.total === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {t('search.no_results')}
              </div>
            )}

            {!loading && results && results.total > 0 && (
              <div className="space-y-4">
                {renderResults(results.conversations, t('search.types.conversations'))}
                {renderResults(results.messages, t('search.types.messages'))}
                {renderResults(results.appointments, t('search.types.appointments'))}
                {renderResults(results.agents, t('search.types.agents'))}
                {renderResults(results.knowledge, t('search.types.knowledge'))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
