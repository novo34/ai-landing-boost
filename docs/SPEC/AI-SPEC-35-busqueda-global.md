# AI-SPEC-35: Búsqueda Global

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **PRD Relacionado:** PRD-35  
> **Prioridad:** 🟡 MEDIA

---

## Arquitectura

### Módulos NestJS a Crear/Modificar

```
apps/api/src/
├── modules/
│   ├── search/
│   │   ├── search.module.ts                       [CREAR]
│   │   ├── search.service.ts                       [CREAR]
│   │   ├── search.controller.ts                    [CREAR]
│   │   └── dto/
│   │       └── search-query.dto.ts                [CREAR]
└── prisma/
    └── schema.prisma                               [MODIFICAR - Agregar índices]
```

---

## Archivos a Crear/Modificar

### 1. Modificar Prisma Schema - Agregar Índices

**Archivo:** `apps/api/prisma/schema.prisma`

**Acción:** Agregar índices FULLTEXT y regulares para optimizar búsquedas

```prisma
// En modelo Conversation
model Conversation {
  // ... campos existentes
  
  @@index([participantName])
  @@index([participantPhone])
  @@fulltext([participantName]) // Si MySQL soporta FULLTEXT en VARCHAR
}

// En modelo Message
model Message {
  // ... campos existentes
  
  @@fulltext([content]) // FULLTEXT index para búsqueda en contenido
}

// En modelo Appointment
model Appointment {
  // ... campos existentes
  
  @@index([participantName])
  @@index([participantPhone])
}

// En modelo Agent
model Agent {
  // ... campos existentes
  
  @@index([name])
  @@fulltext([name])
}

// En modelo KnowledgeCollection
model KnowledgeCollection {
  // ... campos existentes
  
  @@index([name])
  @@fulltext([name])
}

// En modelo KnowledgeSource
model KnowledgeSource {
  // ... campos existentes
  
  @@index([title])
  @@fulltext([title, content]) // FULLTEXT en múltiples columnas
}
```

**Nota:** FULLTEXT index requiere MySQL 5.6+ con InnoDB o MyISAM. Verificar compatibilidad.

---

### 2. Crear Search Service

**Archivo:** `apps/api/src/modules/search/search.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface SearchResult {
  id: string;
  type: string;
  title: string;
  description?: string;
  preview?: string;
  matchField?: string;
  url: string;
  metadata?: Record<string, unknown>;
}

interface SearchResponse {
  query: string;
  results: {
    conversations: SearchResult[];
    messages: SearchResult[];
    appointments: SearchResult[];
    agents: SearchResult[];
    knowledge: SearchResult[];
  };
  total: number;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Realiza una búsqueda global en todas las entidades
   */
  async search(
    tenantId: string,
    query: string,
    types?: string[],
    limit: number = 10,
  ): Promise<{ success: boolean; data: SearchResponse }> {
    if (!query || query.trim().length === 0) {
      return {
        success: true,
        data: {
          query: '',
          results: {
            conversations: [],
            messages: [],
            appointments: [],
            agents: [],
            knowledge: [],
          },
          total: 0,
        },
      };
    }

    const searchTypes = types || ['conversations', 'messages', 'appointments', 'agents', 'knowledge'];
    const searchQuery = query.trim();

    try {
      const results: SearchResponse['results'] = {
        conversations: [],
        messages: [],
        appointments: [],
        agents: [],
        knowledge: [],
      };

      // Búsqueda en paralelo para mejor rendimiento
      const promises: Promise<void>[] = [];

      if (searchTypes.includes('conversations')) {
        promises.push(this.searchConversations(tenantId, searchQuery, limit).then(r => {
          results.conversations = r;
        }));
      }

      if (searchTypes.includes('messages')) {
        promises.push(this.searchMessages(tenantId, searchQuery, limit).then(r => {
          results.messages = r;
        }));
      }

      if (searchTypes.includes('appointments')) {
        promises.push(this.searchAppointments(tenantId, searchQuery, limit).then(r => {
          results.appointments = r;
        }));
      }

      if (searchTypes.includes('agents')) {
        promises.push(this.searchAgents(tenantId, searchQuery, limit).then(r => {
          results.agents = r;
        }));
      }

      if (searchTypes.includes('knowledge')) {
        promises.push(this.searchKnowledge(tenantId, searchQuery, limit).then(r => {
          results.knowledge = r;
        }));
      }

      await Promise.all(promises);

      const total = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);

      return {
        success: true,
        data: {
          query: searchQuery,
          results,
          total,
        },
      };
    } catch (error) {
      this.logger.error(`Error performing search: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Busca en conversaciones
   */
  private async searchConversations(
    tenantId: string,
    query: string,
    limit: number,
  ): Promise<SearchResult[]> {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        tenantId,
        OR: [
          { participantName: { contains: query, mode: 'insensitive' } },
          { participantPhone: { contains: query } },
        ],
      },
      include: {
        messages: {
          where: {
            content: { contains: query, mode: 'insensitive' },
          },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    });

    return conversations.map(conv => ({
      id: conv.id,
      type: 'conversation',
      title: conv.participantName || conv.participantPhone,
      description: `Conversación ${conv.status}`,
      preview: conv.messages[0]?.content?.substring(0, 100),
      matchField: conv.participantName?.toLowerCase().includes(query.toLowerCase())
        ? 'participantName'
        : 'participantPhone',
      url: `/app/conversations/${conv.id}`,
      metadata: {
        conversationId: conv.id,
        status: conv.status,
      },
    }));
  }

  /**
   * Busca en mensajes
   */
  private async searchMessages(
    tenantId: string,
    query: string,
    limit: number,
  ): Promise<SearchResult[]> {
    const messages = await this.prisma.message.findMany({
      where: {
        conversation: {
          tenantId,
        },
        content: {
          contains: query,
          mode: 'insensitive',
        },
      },
      include: {
        conversation: {
          select: {
            id: true,
            participantName: true,
            participantPhone: true,
          },
        },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return messages.map(msg => ({
      id: msg.id,
      type: 'message',
      title: `Mensaje en ${msg.conversation.participantName || msg.conversation.participantPhone}`,
      description: new Date(msg.createdAt).toLocaleDateString(),
      preview: msg.content.substring(0, 150),
      matchField: 'content',
      url: `/app/conversations/${msg.conversationId}#msg-${msg.id}`,
      metadata: {
        messageId: msg.id,
        conversationId: msg.conversationId,
        senderType: msg.senderType,
      },
    }));
  }

  /**
   * Busca en citas
   */
  private async searchAppointments(
    tenantId: string,
    query: string,
    limit: number,
  ): Promise<SearchResult[]> {
    const appointments = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        OR: [
          { participantName: { contains: query, mode: 'insensitive' } },
          { participantPhone: { contains: query } },
          { notes: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: { startTime: 'desc' },
    });

    return appointments.map(apt => ({
      id: apt.id,
      type: 'appointment',
      title: `Cita con ${apt.participantName || apt.participantPhone}`,
      description: `${new Date(apt.startTime).toLocaleDateString()} ${new Date(apt.startTime).toLocaleTimeString()}`,
      preview: apt.notes?.substring(0, 100),
      matchField: apt.participantName?.toLowerCase().includes(query.toLowerCase())
        ? 'participantName'
        : apt.notes?.toLowerCase().includes(query.toLowerCase())
        ? 'notes'
        : 'participantPhone',
      url: `/app/appointments/${apt.id}`,
      metadata: {
        appointmentId: apt.id,
        status: apt.status,
        startTime: apt.startTime,
      },
    }));
  }

  /**
   * Busca en agentes
   */
  private async searchAgents(
    tenantId: string,
    query: string,
    limit: number,
  ): Promise<SearchResult[]> {
    const agents = await this.prisma.agent.findMany({
      where: {
        tenantId,
        name: {
          contains: query,
          mode: 'insensitive',
        },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return agents.map(agent => ({
      id: agent.id,
      type: 'agent',
      title: agent.name,
      description: `Agente ${agent.status}`,
      matchField: 'name',
      url: `/app/agents/${agent.id}`,
      metadata: {
        agentId: agent.id,
        status: agent.status,
      },
    }));
  }

  /**
   * Busca en base de conocimiento
   */
  private async searchKnowledge(
    tenantId: string,
    query: string,
    limit: number,
  ): Promise<SearchResult[]> {
    const [collections, sources] = await Promise.all([
      // Buscar en colecciones
      this.prisma.knowledgeCollection.findMany({
        where: {
          tenantId,
          name: {
            contains: query,
            mode: 'insensitive',
          },
        },
        take: Math.floor(limit / 2),
      }),
      // Buscar en fuentes
      this.prisma.knowledgeSource.findMany({
        where: {
          collection: {
            tenantId,
          },
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { content: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: Math.floor(limit / 2),
        include: {
          collection: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    const results: SearchResult[] = [];

    // Agregar colecciones
    results.push(
      ...collections.map(col => ({
        id: col.id,
        type: 'knowledge_collection',
        title: col.name,
        description: `Colección de conocimiento`,
        preview: col.description?.substring(0, 100),
        matchField: 'name',
        url: `/app/knowledge-base?collection=${col.id}`,
        metadata: {
          collectionId: col.id,
        },
      })),
    );

    // Agregar fuentes
    results.push(
      ...sources.map(src => ({
        id: src.id,
        type: 'knowledge_source',
        title: src.title,
        description: `Fuente en ${src.collection.name}`,
        preview: src.content?.substring(0, 150),
        matchField: src.title?.toLowerCase().includes(query.toLowerCase()) ? 'title' : 'content',
        url: `/app/knowledge-base?source=${src.id}`,
        metadata: {
          sourceId: src.id,
          collectionId: src.collectionId,
        },
      })),
    );

    return results.slice(0, limit);
  }
}
```

---

### 3. Crear Search Controller

**Archivo:** `apps/api/src/modules/search/search.controller.ts`

```typescript
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';

@Controller('search')
@UseGuards(JwtAuthGuard, TenantContextGuard, RbacGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * Realiza una búsqueda global
   */
  @Get()
  async search(
    @CurrentTenant() tenant: { id: string; role: string },
    @Query() query: SearchQueryDto,
  ) {
    const types = query.types ? query.types.split(',') : undefined;
    const limit = query.limit ? parseInt(query.limit, 10) : 10;

    return this.searchService.search(tenant.id, query.q, types, limit);
  }
}
```

---

### 4. Crear Search Module

**Archivo:** `apps/api/src/modules/search/search.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
```

---

## DTOs

### SearchQueryDto

**Archivo:** `apps/api/src/modules/search/dto/search-query.dto.ts`

```typescript
import { IsString, IsOptional, IsNumberString, Matches } from 'class-validator';

export class SearchQueryDto {
  @IsString()
  q: string;

  @IsOptional()
  @IsString()
  @Matches(/^(conversations|messages|appointments|agents|knowledge)(,(conversations|messages|appointments|agents|knowledge))*$/, {
    message: 'types must be comma-separated list of: conversations, messages, appointments, agents, knowledge',
  })
  types?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}
```

---

## Frontend - Componente de Búsqueda Global

### 5. Agregar Método al Cliente API

**Archivo:** `apps/web/lib/api/client.ts`

```typescript
/**
 * Realiza una búsqueda global
 */
async search(
  query: string,
  types?: string[],
  limit?: number,
): Promise<ApiResponse<{
  query: string;
  results: {
    conversations: Array<{
      id: string;
      type: string;
      title: string;
      description?: string;
      preview?: string;
      url: string;
    }>;
    messages: Array<{ id: string; type: string; title: string; preview?: string; url: string }>;
    appointments: Array<{ id: string; type: string; title: string; url: string }>;
    agents: Array<{ id: string; type: string; title: string; url: string }>;
    knowledge: Array<{ id: string; type: string; title: string; url: string }>;
  };
  total: number;
}>> {
  const params = new URLSearchParams({ q: query });
  if (types && types.length > 0) {
    params.append('types', types.join(','));
  }
  if (limit) {
    params.append('limit', limit.toString());
  }
  return this.get(`/search?${params.toString()}`);
}
```

---

### 6. Crear Componente de Búsqueda Global

**Archivo:** `apps/web/components/search/global-search.tsx`

```typescript
'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, Clock } from 'lucide-react';
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
              <div className="text-center py-8 text-muted-foreground">
                {t('search.loading')}
              </div>
            )}

            {!loading && query && results && results.total === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {t('search.no_results')}
              </div>
            )}

            {!loading && results && results.total > 0 && (
              <div className="space-y-4">
                {results.conversations.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">
                      {t('search.types.conversations')} ({results.conversations.length})
                    </h3>
                    <div className="space-y-1">
                      {results.conversations.map(result => (
                        <button
                          key={result.id}
                          onClick={() => handleResultClick(result.url)}
                          className="w-full text-left px-3 py-2 rounded hover:bg-accent"
                        >
                          <p className="font-medium text-sm">{result.title}</p>
                          {result.preview && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                              {result.preview}
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Similar para messages, appointments, agents, knowledge */}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

---

## Validaciones

- **Query mínimo:** Al menos 2 caracteres para buscar
- **Límites:** Máximo 10 resultados por tipo
- **Autenticación:** Solo usuarios autenticados pueden buscar
- **Tenant Context:** Solo se buscan resultados del tenant actual

---

## Errores Esperados

```typescript
- 'search.query_too_short'
- 'search.invalid_types'
- 'search.database_error'
```

---

## Test Plan

### Unit Tests

1. **SearchService:**
   - `search` busca en todos los tipos
   - `searchConversations` encuentra conversaciones correctamente
   - `searchMessages` encuentra mensajes correctamente
   - Manejo de queries vacías
   - Límites funcionan correctamente

### Integration Tests

1. **Flujo completo:**
   - Crear datos de prueba
   - Realizar búsqueda
   - Verificar que resultados coinciden
   - Verificar que links funcionan

---

## Checklist Final

- [ ] Prisma schema actualizado con índices
- [ ] Migración Prisma creada
- [ ] SearchModule creado
- [ ] SearchService implementado
- [ ] SearchController creado
- [ ] Cliente API actualizado
- [ ] Componente GlobalSearch creado
- [ ] Agregar a header del layout
- [ ] Traducciones agregadas (es/en)
- [ ] Tests unitarios escritos
- [ ] Tests de integración escritos
- [ ] Atajo de teclado funciona

---

## Optimizaciones Futuras

- Implementar caché Redis para búsquedas frecuentes
- Usar Elasticsearch para búsquedas más avanzadas
- Agregar búsqueda fuzzy (typos)
- Agregar búsqueda por sinónimos

---

**Última actualización:** 2025-01-XX

