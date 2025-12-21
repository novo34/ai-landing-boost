'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n/client';

interface DocsSearchProps {
  onSearch: (query: string) => void;
  searchResults?: number;
}

export function DocsSearch({ onSearch, searchResults }: DocsSearchProps) {
  const { t } = useTranslation('common');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(query);
    }, 300); // Debounce de 300ms

    return () => clearTimeout(timer);
  }, [query, onSearch]);

  const clearSearch = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <div className="relative mb-6 no-print">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder={t('documentation.search_placeholder') || 'Buscar en la documentación...'}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="pl-10 pr-10"
      />
      {query && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
          onClick={clearSearch}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      {searchResults !== undefined && query && (
        <p className="text-sm text-muted-foreground mt-2">
          {searchResults} {searchResults === 1 ? 'resultado' : 'resultados'} encontrados
        </p>
      )}
    </div>
  );
}
