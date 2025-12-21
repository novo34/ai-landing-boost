'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiClient, KnowledgeCollection, KnowledgeSource } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/lib/i18n/client';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit,
  FileText,
  Globe,
  HelpCircle,
  Folder,
  Save,
  X,
  Upload,
  Link,
  Search,
} from 'lucide-react';
import { VirtualList } from '@/components/ui/virtual-list';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function KnowledgeBasePage() {
  const { toast } = useToast();
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState<KnowledgeCollection[]>([]);
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [activeTab, setActiveTab] = useState<'collections' | 'sources' | 'search'>('collections');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCollectionId, setSearchCollectionId] = useState<string>('');
  const [searchLanguage, setSearchLanguage] = useState<string>('es');
  const [searchResults, setSearchResults] = useState<Array<{
    chunkId: string;
    sourceId: string;
    sourceTitle: string;
    collectionId?: string;
    collectionName?: string;
    content: string;
    similarity: number;
    chunkIndex: number;
    language?: string;
  }>>([]);
  const [searching, setSearching] = useState(false);

  // Collection form state
  const [showCollectionDialog, setShowCollectionDialog] = useState(false);
  const [editingCollection, setEditingCollection] = useState<KnowledgeCollection | null>(null);
  const [collectionForm, setCollectionForm] = useState({
    name: '',
    description: '',
    language: 'es',
  });

  // Source form state
  const [showSourceDialog, setShowSourceDialog] = useState(false);
  const [editingSource, setEditingSource] = useState<KnowledgeSource | null>(null);
  const [sourceForm, setSourceForm] = useState({
    collectionId: '',
    type: 'FAQ' as KnowledgeSource['type'],
    title: '',
    language: 'es',
    content: '',
    url: '',
  });

  // Import document form state
  const [showImportDocumentDialog, setShowImportDocumentDialog] = useState(false);
  const [importDocumentForm, setImportDocumentForm] = useState({
    collectionId: '',
    title: '',
    language: 'es',
    documentUrl: '',
  });

  // Import URL form state
  const [showImportUrlDialog, setShowImportUrlDialog] = useState(false);
  const [importUrlForm, setImportUrlForm] = useState({
    collectionId: '',
    title: '',
    language: 'es',
    url: '',
  });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [collectionsResponse, sourcesResponse] = await Promise.all([
        apiClient.getKnowledgeCollections(),
        apiClient.getKnowledgeSources(),
      ]);

      if (collectionsResponse.success && collectionsResponse.data) {
        setCollections(collectionsResponse.data);
      }

      if (sourcesResponse.success && sourcesResponse.data) {
        setSources(sourcesResponse.data);
      }
    } catch (error) {
      console.error('Error loading knowledge base:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.load_failed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCollection = async () => {
    try {
      const response = await apiClient.createKnowledgeCollection({
        name: collectionForm.name,
        description: collectionForm.description || undefined,
        language: collectionForm.language,
      });

      if (response.success) {
        toast({
          title: t('knowledge.collection_created'),
          description: t('knowledge.collection_created_success'),
        });
        setShowCollectionDialog(false);
        resetCollectionForm();
        loadData();
      }
    } catch (error) {
      console.error('Error creating collection:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.create_failed'),
        variant: 'destructive',
      });
    }
  };

  const handleUpdateCollection = async () => {
    if (!editingCollection) return;

    try {
      const response = await apiClient.updateKnowledgeCollection(editingCollection.id, {
        name: collectionForm.name,
        description: collectionForm.description || undefined,
        language: collectionForm.language,
      });

      if (response.success) {
        toast({
          title: t('knowledge.collection_updated'),
          description: t('knowledge.collection_updated_success'),
        });
        setShowCollectionDialog(false);
        setEditingCollection(null);
        resetCollectionForm();
        loadData();
      }
    } catch (error) {
      console.error('Error updating collection:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.update_failed'),
        variant: 'destructive',
      });
    }
  };

  const handleDeleteCollection = async (id: string) => {
    if (!confirm(t('knowledge.confirm_delete_collection'))) {
      return;
    }

    try {
      const response = await apiClient.deleteKnowledgeCollection(id);
      if (response.success) {
        toast({
          title: t('knowledge.collection_deleted'),
          description: t('knowledge.collection_deleted_success'),
        });
        loadData();
      }
    } catch (error) {
      console.error('Error deleting collection:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.delete_failed'),
        variant: 'destructive',
      });
    }
  };

  const handleCreateSource = async () => {
    try {
      const response = await apiClient.createKnowledgeSource({
        collectionId: sourceForm.collectionId && sourceForm.collectionId !== 'none' ? sourceForm.collectionId : undefined,
        type: sourceForm.type,
        title: sourceForm.title,
        language: sourceForm.language,
        content: sourceForm.content || undefined,
        url: sourceForm.url || undefined,
      });

      if (response.success) {
        toast({
          title: t('knowledge.source_created'),
          description: t('knowledge.source_created_success'),
        });
        setShowSourceDialog(false);
        resetSourceForm();
        loadData();
      }
    } catch (error) {
      console.error('Error creating source:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.create_failed'),
        variant: 'destructive',
      });
    }
  };

  const handleUpdateSource = async () => {
    if (!editingSource) return;

    try {
      const response = await apiClient.updateKnowledgeSource(editingSource.id, {
        collectionId: sourceForm.collectionId && sourceForm.collectionId !== 'none' ? sourceForm.collectionId : undefined,
        type: sourceForm.type,
        title: sourceForm.title,
        language: sourceForm.language,
        content: sourceForm.content || undefined,
        url: sourceForm.url || undefined,
      });

      if (response.success) {
        toast({
          title: t('knowledge.source_updated'),
          description: t('knowledge.source_updated_success'),
        });
        setShowSourceDialog(false);
        setEditingSource(null);
        resetSourceForm();
        loadData();
      }
    } catch (error) {
      console.error('Error updating source:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.update_failed'),
        variant: 'destructive',
      });
    }
  };

  const handleDeleteSource = async (id: string) => {
    if (!confirm(t('knowledge.confirm_delete_source'))) {
      return;
    }

    try {
      const response = await apiClient.deleteKnowledgeSource(id);
      if (response.success) {
        toast({
          title: t('knowledge.source_deleted'),
          description: t('knowledge.source_deleted_success'),
        });
        loadData();
      }
    } catch (error) {
      console.error('Error deleting source:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.delete_failed'),
        variant: 'destructive',
      });
    }
  };

  const handleImportDocument = async () => {
    try {
      const response = await apiClient.createKnowledgeSource({
        collectionId: importDocumentForm.collectionId && importDocumentForm.collectionId !== 'none' ? importDocumentForm.collectionId : undefined,
        type: 'DOC',
        title: importDocumentForm.title,
        language: importDocumentForm.language,
        url: importDocumentForm.documentUrl,
      });

      if (response.success) {
        toast({
          title: t('knowledge.document_imported'),
          description: t('knowledge.document_imported_success'),
        });
        setShowImportDocumentDialog(false);
        resetImportDocumentForm();
        loadData();
      }
    } catch (error) {
      console.error('Error importing document:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.import_failed'),
        variant: 'destructive',
      });
    }
  };

  const handleImportUrl = async () => {
    try {
      const response = await apiClient.createKnowledgeSource({
        collectionId: importUrlForm.collectionId && importUrlForm.collectionId !== 'none' ? importUrlForm.collectionId : undefined,
        type: 'URL_SCRAPE',
        title: importUrlForm.title,
        language: importUrlForm.language,
        url: importUrlForm.url,
      });

      if (response.success) {
        toast({
          title: t('knowledge.url_imported'),
          description: t('knowledge.url_imported_success'),
        });
        setShowImportUrlDialog(false);
        resetImportUrlForm();
        loadData();
      }
    } catch (error) {
      console.error('Error importing URL:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.import_failed'),
        variant: 'destructive',
      });
    }
  };

  const resetCollectionForm = () => {
    setCollectionForm({
      name: '',
      description: '',
      language: 'es',
    });
  };

  const resetSourceForm = () => {
    setSourceForm({
      collectionId: 'none',
      type: 'FAQ',
      title: '',
      language: 'es',
      content: '',
      url: '',
    });
  };

  const resetImportDocumentForm = () => {
    setImportDocumentForm({
      collectionId: '',
      title: '',
      language: 'es',
      documentUrl: '',
    });
  };

  const resetImportUrlForm = () => {
    setImportUrlForm({
      collectionId: '',
      title: '',
      language: 'es',
      url: '',
    });
  };

  const openCollectionDialog = (collection?: KnowledgeCollection) => {
    if (collection) {
      setEditingCollection(collection);
      setCollectionForm({
        name: collection.name,
        description: collection.description || '',
        language: collection.language,
      });
    } else {
      setEditingCollection(null);
      resetCollectionForm();
    }
    setShowCollectionDialog(true);
  };

  const openSourceDialog = (source?: KnowledgeSource) => {
    if (source) {
      setEditingSource(source);
      setSourceForm({
        collectionId: source.collectionId || 'none',
        type: source.type,
        title: source.title,
        language: source.language,
        content: source.content || '',
        url: source.url || '',
      });
    } else {
      setEditingSource(null);
      resetSourceForm();
    }
    setShowSourceDialog(true);
  };

  const getSourceTypeIcon = (type: KnowledgeSource['type']) => {
    switch (type) {
      case 'FAQ':
        return <HelpCircle className="h-4 w-4" />;
      case 'DOC':
        return <FileText className="h-4 w-4" />;
      case 'URL_SCRAPE':
        return <Globe className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getSourceTypeLabel = (type: KnowledgeSource['type']) => {
    switch (type) {
      case 'FAQ':
        return t('knowledge.source_types.FAQ');
      case 'DOC':
        return t('knowledge.source_types.DOC');
      case 'URL_SCRAPE':
        return t('knowledge.source_types.URL_SCRAPE');
      case 'MANUAL_ENTRY':
        return t('knowledge.source_types.MANUAL_ENTRY');
      case 'CALENDAR':
        return t('knowledge.source_types.CALENDAR');
      case 'CRM':
        return t('knowledge.source_types.CRM');
      default:
        return type;
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: t('errors.generic'),
        description: t('knowledge.search_query_required'),
        variant: 'destructive',
      });
      return;
    }

    try {
      setSearching(true);
      const response = await apiClient.searchKnowledgeBase({
        query: searchQuery,
        language: searchLanguage || undefined,
        collectionId: searchCollectionId && searchCollectionId !== 'none' ? searchCollectionId : undefined,
        limit: 10,
      });

      if (response.success && response.data) {
        setSearchResults(response.data.results);
        if (response.data.results.length === 0) {
          toast({
            title: t('knowledge.no_results'),
            description: t('knowledge.no_results_description'),
          });
        }
      }
    } catch (error) {
      console.error('Error searching knowledge base:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.search_failed'),
        variant: 'destructive',
      });
    } finally {
      setSearching(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="h-8 w-8" />
            {t('knowledge.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('knowledge.description')}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'collections' | 'sources' | 'search')}>
        <TabsList>
          <TabsTrigger value="collections">
            <Folder className="h-4 w-4 mr-2" />
            {t('knowledge.collections')}
          </TabsTrigger>
          <TabsTrigger value="sources">
            <FileText className="h-4 w-4 mr-2" />
            {t('knowledge.sources')}
          </TabsTrigger>
          <TabsTrigger value="search">
            <Search className="h-4 w-4 mr-2" />
            {t('knowledge.search')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="collections" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openCollectionDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              {t('knowledge.create_collection')}
            </Button>
          </div>

          {collections.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Folder className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {t('knowledge.no_collections')}
                </h3>
                <p className="text-muted-foreground text-center mb-4">
                  {t('knowledge.no_collections_description')}
                </p>
                <Button onClick={() => openCollectionDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('knowledge.create_collection')}
                </Button>
              </CardContent>
            </Card>
          ) : collections.length < 20 ? (
            // Para listas pequeñas, no usar virtualización
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {collections.map((collection) => (
                <Card key={collection.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Folder className="h-5 w-5" />
                        {collection.name}
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openCollectionDialog(collection)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCollection(collection.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription>
                      {collection.description || t('knowledge.no_description')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <Badge variant="outline">{collection.language}</Badge>
                      <span className="text-muted-foreground">
                        {collection.sources?.length || 0} {t('knowledge.sources')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            // Para listas grandes, usar virtualización
            <VirtualList
              items={collections}
              estimateSize={180}
              overscan={5}
              className="h-[calc(100vh-400px)]"
              emptyMessage={t('knowledge.no_collections')}
              emptyIcon={<Folder className="h-12 w-12 text-muted-foreground mb-4" />}
              renderItem={(collection) => (
                <div className="p-2">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Folder className="h-5 w-5" />
                          {collection.name}
                        </CardTitle>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openCollectionDialog(collection)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCollection(collection.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <CardDescription>
                        {collection.description || t('knowledge.no_description')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm">
                        <Badge variant="outline">{collection.language}</Badge>
                        <span className="text-muted-foreground">
                          {collection.sources?.length || 0} {t('knowledge.sources')}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            />
          )}
        </TabsContent>

        <TabsContent value="sources" className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowImportDocumentDialog(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              {t('knowledge.import_document')}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowImportUrlDialog(true)}
            >
              <Link className="h-4 w-4 mr-2" />
              {t('knowledge.import_url')}
            </Button>
            <Button onClick={() => openSourceDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              {t('knowledge.create_source')}
            </Button>
          </div>

          {sources.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {t('knowledge.no_sources')}
                </h3>
                <p className="text-muted-foreground text-center mb-4">
                  {t('knowledge.no_sources_description')}
                </p>
                <Button onClick={() => openSourceDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('knowledge.create_source')}
                </Button>
              </CardContent>
            </Card>
          ) : sources.length < 30 ? (
            // Para listas pequeñas, no usar virtualización
            <div className="grid gap-4">
              {sources.map((source) => (
                <Card key={source.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getSourceTypeIcon(source.type)}
                        <CardTitle>{source.title}</CardTitle>
                        <Badge variant="secondary">{getSourceTypeLabel(source.type)}</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openSourceDialog(source)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSource(source.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription>
                      {source.collection?.name || t('knowledge.no_collection')} • {source.language}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {source.content && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {source.content}
                      </p>
                    )}
                    {source.url && (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {source.url}
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            // Para listas grandes, usar virtualización
            <VirtualList
              items={sources}
              estimateSize={180}
              overscan={5}
              className="h-[calc(100vh-400px)]"
              emptyMessage={t('knowledge.no_sources')}
              emptyIcon={<FileText className="h-12 w-12 text-muted-foreground mb-4" />}
              renderItem={(source) => (
                <div className="mb-4">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getSourceTypeIcon(source.type)}
                          <CardTitle>{source.title}</CardTitle>
                          <Badge variant="secondary">{getSourceTypeLabel(source.type)}</Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openSourceDialog(source)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSource(source.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <CardDescription>
                        {source.collection?.name || t('knowledge.no_collection')} • {source.language}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {source.content && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {source.content}
                        </p>
                      )}
                      {source.url && (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {source.url}
                        </a>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            />
          )}
        </TabsContent>

        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('knowledge.semantic_search')}</CardTitle>
              <CardDescription>
                {t('knowledge.semantic_search_description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="search-query">
                  {t('knowledge.search_query')} *
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="search-query"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !searching) {
                        handleSearch();
                      }
                    }}
                    placeholder={t('knowledge.search_placeholder')}
                    className="flex-1"
                  />
                  <Button onClick={handleSearch} disabled={searching || !searchQuery.trim()}>
                    <Search className="h-4 w-4 mr-2" />
                    {searching ? t('common.searching') : t('common.search')}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search-collection">
                    {t('knowledge.collection')}
                  </Label>
                  <Select
                    value={searchCollectionId || 'none'}
                    onValueChange={(value) => setSearchCollectionId(value)}
                  >
                    <SelectTrigger id="search-collection">
                      <SelectValue placeholder={t('knowledge.all_collections')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('knowledge.all_collections')}</SelectItem>
                      {collections.map((collection) => (
                        <SelectItem key={collection.id} value={collection.id}>
                          {collection.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="search-language">
                    {t('knowledge.language')}
                  </Label>
                  <Select
                    value={searchLanguage}
                    onValueChange={(value) => setSearchLanguage(value)}
                  >
                    <SelectTrigger id="search-language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="de">Deutsch</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="it">Italiano</SelectItem>
                      <SelectItem value="pt">Português</SelectItem>
                      <SelectItem value="nl">Nederlands</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {searchResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {t('knowledge.search_results')} ({searchResults.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {searchResults.map((result, index) => (
                    <Card key={result.chunkId} className="border-l-4 border-l-primary">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">{result.sourceTitle}</Badge>
                              {result.collectionName && (
                                <Badge variant="secondary">{result.collectionName}</Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {Math.round(result.similarity * 100)}% {t('knowledge.similarity')}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {result.content}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{t('knowledge.chunk')} #{result.chunkIndex + 1}</span>
                              {result.language && (
                                <>
                                  <span>•</span>
                                  <span>{result.language.toUpperCase()}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Collection Dialog */}
      <Dialog open={showCollectionDialog} onOpenChange={setShowCollectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCollection
                ? t('knowledge.edit_collection')
                : t('knowledge.create_collection')}
            </DialogTitle>
            <DialogDescription>
              {t('knowledge.collection_dialog_description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="collection-name">
                {t('knowledge.name')} *
              </Label>
              <Input
                id="collection-name"
                value={collectionForm.name}
                onChange={(e) => setCollectionForm({ ...collectionForm, name: e.target.value })}
                placeholder={t('knowledge.collection_name_placeholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="collection-description">
                {t('knowledge.description')}
              </Label>
              <Textarea
                id="collection-description"
                value={collectionForm.description}
                onChange={(e) =>
                  setCollectionForm({ ...collectionForm, description: e.target.value })
                }
                placeholder={t('knowledge.collection_description_placeholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="collection-language">
                {t('knowledge.language')} *
              </Label>
              <Select
                value={collectionForm.language}
                onValueChange={(value) => setCollectionForm({ ...collectionForm, language: value })}
              >
                <SelectTrigger id="collection-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">{t('settings.languages.es')}</SelectItem>
                  <SelectItem value="en">{t('settings.languages.en')}</SelectItem>
                  <SelectItem value="de">{t('settings.languages.de')}</SelectItem>
                  <SelectItem value="fr">{t('settings.languages.fr')}</SelectItem>
                  <SelectItem value="it">{t('settings.languages.it')}</SelectItem>
                  <SelectItem value="pt">{t('settings.languages.pt')}</SelectItem>
                  <SelectItem value="nl">{t('settings.languages.nl')}</SelectItem>
                  <SelectItem value="pl">{t('settings.languages.pl')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCollectionDialog(false)}>
                <X className="h-4 w-4 mr-2" />
                {t('common.cancel')}
              </Button>
              <Button
                onClick={editingCollection ? handleUpdateCollection : handleCreateCollection}
                disabled={!collectionForm.name}
              >
                <Save className="h-4 w-4 mr-2" />
                {editingCollection
                  ? t('common.save')
                  : t('common.create')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Source Dialog */}
      <Dialog open={showSourceDialog} onOpenChange={setShowSourceDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSource
                ? t('knowledge.edit_source')
                : t('knowledge.create_source')}
            </DialogTitle>
            <DialogDescription>
              {t('knowledge.source_dialog_description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="source-type">
                {t('knowledge.type')} *
              </Label>
              <Select
                value={sourceForm.type}
                onValueChange={(value) =>
                  setSourceForm({ ...sourceForm, type: value as KnowledgeSource['type'] })
                }
              >
                <SelectTrigger id="source-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FAQ">{t('knowledge.source_types.FAQ')}</SelectItem>
                  <SelectItem value="MANUAL_ENTRY">{t('knowledge.source_types.MANUAL_ENTRY')}</SelectItem>
                  <SelectItem value="DOC">{t('knowledge.source_types.DOC')}</SelectItem>
                  <SelectItem value="URL_SCRAPE">{t('knowledge.source_types.URL_SCRAPE')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="source-collection">
                {t('knowledge.collection')}
              </Label>
              <Select
                value={sourceForm.collectionId || 'none'}
                onValueChange={(value) => setSourceForm({ ...sourceForm, collectionId: value })}
              >
                <SelectTrigger id="source-collection">
                  <SelectValue placeholder={t('knowledge.select_collection')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('knowledge.no_collection')}</SelectItem>
                  {collections.map((collection) => (
                    <SelectItem key={collection.id} value={collection.id}>
                      {collection.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="source-title">
                {t('knowledge.title')} *
              </Label>
              <Input
                id="source-title"
                value={sourceForm.title}
                onChange={(e) => setSourceForm({ ...sourceForm, title: e.target.value })}
                placeholder={t('knowledge.source_title_placeholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source-language">
                {t('knowledge.language')} *
              </Label>
              <Select
                value={sourceForm.language}
                onValueChange={(value) => setSourceForm({ ...sourceForm, language: value })}
              >
                <SelectTrigger id="source-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">{t('settings.languages.es')}</SelectItem>
                  <SelectItem value="en">{t('settings.languages.en')}</SelectItem>
                  <SelectItem value="de">{t('settings.languages.de')}</SelectItem>
                  <SelectItem value="fr">{t('settings.languages.fr')}</SelectItem>
                  <SelectItem value="it">{t('settings.languages.it')}</SelectItem>
                  <SelectItem value="pt">{t('settings.languages.pt')}</SelectItem>
                  <SelectItem value="nl">{t('settings.languages.nl')}</SelectItem>
                  <SelectItem value="pl">{t('settings.languages.pl')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(sourceForm.type === 'FAQ' || sourceForm.type === 'MANUAL_ENTRY') && (
              <div className="space-y-2">
                <Label htmlFor="source-content">
                  {t('knowledge.content')} *
                </Label>
                <Textarea
                  id="source-content"
                  value={sourceForm.content}
                  onChange={(e) => setSourceForm({ ...sourceForm, content: e.target.value })}
                  placeholder={t('knowledge.source_content_placeholder')}
                  rows={6}
                />
              </div>
            )}
            {sourceForm.type === 'URL_SCRAPE' && (
              <div className="space-y-2">
                <Label htmlFor="source-url">
                  {t('knowledge.url')} *
                </Label>
                <Input
                  id="source-url"
                  type="url"
                  value={sourceForm.url}
                  onChange={(e) => setSourceForm({ ...sourceForm, url: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSourceDialog(false)}>
                <X className="h-4 w-4 mr-2" />
                {t('common.cancel')}
              </Button>
              <Button
                onClick={editingSource ? handleUpdateSource : handleCreateSource}
                disabled={!sourceForm.title || (sourceForm.type !== 'URL_SCRAPE' && !sourceForm.content)}
              >
                <Save className="h-4 w-4 mr-2" />
                {editingSource
                  ? t('common.save')
                  : t('common.create')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Document Dialog */}
      <Dialog open={showImportDocumentDialog} onOpenChange={setShowImportDocumentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('knowledge.import_document')}
            </DialogTitle>
            <DialogDescription>
              {t('knowledge.import_document_description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="import-document-collection">
                {t('knowledge.collection')}
              </Label>
              <Select
                value={importDocumentForm.collectionId || 'none'}
                onValueChange={(value) => setImportDocumentForm({ ...importDocumentForm, collectionId: value })}
              >
                <SelectTrigger id="import-document-collection">
                  <SelectValue placeholder={t('knowledge.select_collection')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('knowledge.no_collection')}</SelectItem>
                  {collections.map((collection) => (
                    <SelectItem key={collection.id} value={collection.id}>
                      {collection.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="import-document-title">
                {t('knowledge.title')} *
              </Label>
              <Input
                id="import-document-title"
                value={importDocumentForm.title}
                onChange={(e) => setImportDocumentForm({ ...importDocumentForm, title: e.target.value })}
                placeholder={t('knowledge.document_title_placeholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="import-document-language">
                {t('knowledge.language')} *
              </Label>
              <Select
                value={importDocumentForm.language}
                onValueChange={(value) => setImportDocumentForm({ ...importDocumentForm, language: value })}
              >
                <SelectTrigger id="import-document-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">{t('settings.languages.es')}</SelectItem>
                  <SelectItem value="en">{t('settings.languages.en')}</SelectItem>
                  <SelectItem value="de">{t('settings.languages.de')}</SelectItem>
                  <SelectItem value="fr">{t('settings.languages.fr')}</SelectItem>
                  <SelectItem value="it">{t('settings.languages.it')}</SelectItem>
                  <SelectItem value="pt">{t('settings.languages.pt')}</SelectItem>
                  <SelectItem value="nl">{t('settings.languages.nl')}</SelectItem>
                  <SelectItem value="pl">{t('settings.languages.pl')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="import-document-url">
                {t('knowledge.document_url')} *
              </Label>
              <Input
                id="import-document-url"
                type="url"
                value={importDocumentForm.documentUrl}
                onChange={(e) => setImportDocumentForm({ ...importDocumentForm, documentUrl: e.target.value })}
                placeholder="https://example.com/document.pdf"
              />
              <p className="text-xs text-muted-foreground">
                {t('knowledge.document_url_hint')}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowImportDocumentDialog(false)}>
                <X className="h-4 w-4 mr-2" />
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleImportDocument}
                disabled={!importDocumentForm.title || !importDocumentForm.documentUrl}
              >
                <Upload className="h-4 w-4 mr-2" />
                {t('knowledge.import')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import URL Dialog */}
      <Dialog open={showImportUrlDialog} onOpenChange={setShowImportUrlDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('knowledge.import_url')}
            </DialogTitle>
            <DialogDescription>
              {t('knowledge.import_url_description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="import-url-collection">
                {t('knowledge.collection')}
              </Label>
              <Select
                value={importUrlForm.collectionId || 'none'}
                onValueChange={(value) => setImportUrlForm({ ...importUrlForm, collectionId: value })}
              >
                <SelectTrigger id="import-url-collection">
                  <SelectValue placeholder={t('knowledge.select_collection')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('knowledge.no_collection')}</SelectItem>
                  {collections.map((collection) => (
                    <SelectItem key={collection.id} value={collection.id}>
                      {collection.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="import-url-title">
                {t('knowledge.title')} *
              </Label>
              <Input
                id="import-url-title"
                value={importUrlForm.title}
                onChange={(e) => setImportUrlForm({ ...importUrlForm, title: e.target.value })}
                placeholder={t('knowledge.url_title_placeholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="import-url-language">
                {t('knowledge.language')} *
              </Label>
              <Select
                value={importUrlForm.language}
                onValueChange={(value) => setImportUrlForm({ ...importUrlForm, language: value })}
              >
                <SelectTrigger id="import-url-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">{t('settings.languages.es')}</SelectItem>
                  <SelectItem value="en">{t('settings.languages.en')}</SelectItem>
                  <SelectItem value="de">{t('settings.languages.de')}</SelectItem>
                  <SelectItem value="fr">{t('settings.languages.fr')}</SelectItem>
                  <SelectItem value="it">{t('settings.languages.it')}</SelectItem>
                  <SelectItem value="pt">{t('settings.languages.pt')}</SelectItem>
                  <SelectItem value="nl">{t('settings.languages.nl')}</SelectItem>
                  <SelectItem value="pl">{t('settings.languages.pl')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="import-url-url">
                {t('knowledge.url')} *
              </Label>
              <Input
                id="import-url-url"
                type="url"
                value={importUrlForm.url}
                onChange={(e) => setImportUrlForm({ ...importUrlForm, url: e.target.value })}
                placeholder="https://example.com"
              />
              <p className="text-xs text-muted-foreground">
                {t('knowledge.url_scraping_hint')}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowImportUrlDialog(false)}>
                <X className="h-4 w-4 mr-2" />
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleImportUrl}
                disabled={!importUrlForm.title || !importUrlForm.url}
              >
                <Link className="h-4 w-4 mr-2" />
                {t('knowledge.import')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
