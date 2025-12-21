/**
 * Componente de lista virtualizada reutilizable
 * Usa @tanstack/react-virtual para renderizar solo los items visibles
 */

'use client';

import React, { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';

interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  estimateSize?: number;
  overscan?: number;
  className?: string;
  containerClassName?: string;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  minHeight?: number;
}

export function VirtualList<T>({
  items,
  renderItem,
  estimateSize = 80,
  overscan = 5,
  className,
  containerClassName,
  emptyMessage,
  emptyIcon,
  minHeight = 400,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  // Obtener items virtuales (se actualizan automáticamente)
  const virtualItems = virtualizer.getVirtualItems();

  if (items.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12', containerClassName)}>
        {emptyIcon}
        {emptyMessage && (
          <p className="text-muted-foreground text-center mt-4">{emptyMessage}</p>
        )}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={cn('overflow-auto', className)}
      style={{ minHeight }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem) => (
          <div
            key={virtualItem.key}
            data-index={virtualItem.index}
            ref={virtualizer.measureElement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  );
}


