'use client';

import { useEffect, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslation } from '@/lib/i18n/client';
import { cn } from '@/lib/utils';

interface Heading {
  id: string;
  text: string;
  level: number;
}

interface DocsTableOfContentsProps {
  content: string;
}

export function DocsTableOfContents({ content }: DocsTableOfContentsProps) {
  const { t } = useTranslation('common');
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    // Extraer headings del contenido markdown
    const headingRegex = /^(#{1,4})\s+(.+)$/gm;
    const matches: Heading[] = [];
    let match;

    while ((match = headingRegex.exec(content)) !== null) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

      matches.push({ id, text, level });
    }

    setHeadings(matches);
  }, [content]);

  useEffect(() => {
    // Detectar heading activo al hacer scroll
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0% -35% 0%' }
    );

    headings.forEach((heading) => {
      const element = document.getElementById(heading.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      headings.forEach((heading) => {
        const element = document.getElementById(heading.id);
        if (element) {
          observer.unobserve(element);
        }
      });
    };
  }, [headings]);

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveId(id);
    }
  };

  if (headings.length === 0) {
    return null;
  }

  return (
    <div className="hidden lg:block w-64 shrink-0 no-print">
      <div className="sticky top-20">
        <ScrollArea className="h-[calc(100vh-8rem)]">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold mb-4">
              {t('documentation.table_of_contents') || 'Índice'}
            </h3>
            {headings.map((heading) => (
              <button
                key={heading.id}
                onClick={() => scrollToHeading(heading.id)}
                className={cn(
                  'block w-full text-left text-sm py-1 px-2 rounded transition-colors',
                  heading.level === 1 && 'font-semibold',
                  heading.level === 2 && 'pl-4',
                  heading.level === 3 && 'pl-6 text-xs',
                  heading.level === 4 && 'pl-8 text-xs',
                  activeId === heading.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                {heading.text}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
