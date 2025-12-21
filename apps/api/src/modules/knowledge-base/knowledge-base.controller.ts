import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { KnowledgeBaseService } from './knowledge-base.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { CreateSourceDto } from './dto/create-source.dto';
import { UpdateSourceDto } from './dto/update-source.dto';
import { ImportDocumentDto } from './dto/import-document.dto';
import { ImportUrlDto } from './dto/import-url.dto';
import { SearchDto } from './dto/search.dto';
import { SemanticSearchService } from './services/semantic-search.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { $Enums } from '@prisma/client';

@Controller('knowledge')
@UseGuards(JwtAuthGuard, TenantContextGuard, RbacGuard)
export class KnowledgeBaseController {
  constructor(
    private readonly knowledgeBaseService: KnowledgeBaseService,
    private readonly semanticSearchService: SemanticSearchService,
  ) {}

  // ============================================
  // Collections Endpoints
  // ============================================

  /**
   * Lista todas las colecciones del tenant
   */
  @Get('collections')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN, $Enums.tenantmembership_role.AGENT, $Enums.tenantmembership_role.VIEWER)
  async getCollections(@CurrentTenant() tenant: { id: string; role: string }) {
    return this.knowledgeBaseService.getCollections(tenant.id);
  }

  /**
   * Obtiene una colección específica por ID
   */
  @Get('collections/:id')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN, $Enums.tenantmembership_role.AGENT, $Enums.tenantmembership_role.VIEWER)
  async getCollectionById(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('id') id: string,
  ) {
    return this.knowledgeBaseService.getCollectionById(tenant.id, id);
  }

  /**
   * Crea una nueva colección
   */
  @Post('collections')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN, $Enums.tenantmembership_role.AGENT)
  @HttpCode(HttpStatus.CREATED)
  async createCollection(
    @CurrentTenant() tenant: { id: string; role: string },
    @Body() dto: CreateCollectionDto,
  ) {
    return this.knowledgeBaseService.createCollection(tenant.id, dto);
  }

  /**
   * Actualiza una colección
   */
  @Put('collections/:id')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN, $Enums.tenantmembership_role.AGENT)
  async updateCollection(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('id') id: string,
    @Body() dto: UpdateCollectionDto,
  ) {
    return this.knowledgeBaseService.updateCollection(tenant.id, id, dto);
  }

  /**
   * Elimina una colección
   */
  @Delete('collections/:id')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteCollection(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('id') id: string,
  ) {
    return this.knowledgeBaseService.deleteCollection(tenant.id, id);
  }

  // ============================================
  // Sources Endpoints
  // ============================================

  /**
   * Lista todas las fuentes del tenant
   */
  @Get('sources')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN, $Enums.tenantmembership_role.AGENT, $Enums.tenantmembership_role.VIEWER)
  async getSources(
    @CurrentTenant() tenant: { id: string; role: string },
    @Query('collectionId') collectionId?: string,
  ) {
    return this.knowledgeBaseService.getSources(tenant.id, collectionId);
  }

  /**
   * Obtiene una fuente específica por ID
   */
  @Get('sources/:id')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN, $Enums.tenantmembership_role.AGENT, $Enums.tenantmembership_role.VIEWER)
  async getSourceById(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('id') id: string,
  ) {
    return this.knowledgeBaseService.getSourceById(tenant.id, id);
  }

  /**
   * Crea una nueva fuente
   */
  @Post('sources')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN, $Enums.tenantmembership_role.AGENT)
  @HttpCode(HttpStatus.CREATED)
  async createSource(
    @CurrentTenant() tenant: { id: string; role: string },
    @Body() dto: CreateSourceDto,
  ) {
    return this.knowledgeBaseService.createSource(tenant.id, dto);
  }

  /**
   * Actualiza una fuente
   */
  @Put('sources/:id')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN, $Enums.tenantmembership_role.AGENT)
  async updateSource(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('id') id: string,
    @Body() dto: UpdateSourceDto,
  ) {
    return this.knowledgeBaseService.updateSource(tenant.id, id, dto);
  }

  /**
   * Elimina una fuente
   */
  @Delete('sources/:id')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteSource(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('id') id: string,
  ) {
    return this.knowledgeBaseService.deleteSource(tenant.id, id);
  }

  // ============================================
  // Import Endpoints
  // ============================================

  /**
   * Importa un documento
   */
  @Post('import/document')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN, $Enums.tenantmembership_role.AGENT)
  @HttpCode(HttpStatus.CREATED)
  async importDocument(
    @CurrentTenant() tenant: { id: string; role: string },
    @Body() dto: ImportDocumentDto,
  ) {
    return this.knowledgeBaseService.importDocument(tenant.id, dto);
  }

  /**
   * Importa contenido desde una URL
   */
  @Post('import/url')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN, $Enums.tenantmembership_role.AGENT)
  @HttpCode(HttpStatus.CREATED)
  async importUrl(
    @CurrentTenant() tenant: { id: string; role: string },
    @Body() dto: ImportUrlDto,
  ) {
    return this.knowledgeBaseService.importUrl(tenant.id, dto);
  }

  // ============================================
  // Search Endpoints
  // ============================================

  /**
   * Realiza una búsqueda semántica en la base de conocimiento
   */
  @Post('search')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN, $Enums.tenantmembership_role.AGENT, $Enums.tenantmembership_role.VIEWER)
  async search(
    @CurrentTenant() tenant: { id: string; role: string },
    @Body() dto: SearchDto,
  ) {
    return this.semanticSearchService.search(tenant.id, dto.query, {
      language: dto.language,
      collectionId: dto.collectionId,
      limit: dto.limit,
    });
  }
}

