import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { SearchService, SearchResponse } from './search.service';
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
