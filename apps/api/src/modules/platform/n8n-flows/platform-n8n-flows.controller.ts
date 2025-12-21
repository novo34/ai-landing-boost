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
} from '@nestjs/common';
import { PlatformN8NFlowsService } from './platform-n8n-flows.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PlatformGuard } from '../../../common/guards/platform.guard';
import { CreatePlatformFlowDto } from './dto/create-platform-flow.dto';
import { UpdatePlatformFlowDto } from './dto/update-platform-flow.dto';

@Controller('platform/n8n-flows')
@UseGuards(JwtAuthGuard, PlatformGuard)
export class PlatformN8NFlowsController {
  constructor(private readonly flowsService: PlatformN8NFlowsService) {}

  /**
   * Crea un nuevo flujo
   */
  @Post()
  async createFlow(@Body() dto: CreatePlatformFlowDto) {
    return this.flowsService.createFlow(dto);
  }

  /**
   * Lista todos los flujos
   */
  @Get()
  async listFlows(
    @Query('category') category?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.flowsService.listFlows({
      category,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
  }

  /**
   * Obtiene detalles de un flujo
   */
  @Get(':flowId')
  async getFlowDetails(@Param('flowId') flowId: string) {
    return this.flowsService.getFlowDetails(flowId);
  }

  /**
   * Actualiza un flujo
   */
  @Put(':flowId')
  async updateFlow(
    @Param('flowId') flowId: string,
    @Body() dto: UpdatePlatformFlowDto,
  ) {
    return this.flowsService.updateFlow(flowId, dto);
  }

  /**
   * Activa un flujo
   */
  @Post(':flowId/activate')
  async activateFlow(@Param('flowId') flowId: string) {
    return this.flowsService.activateFlow(flowId);
  }

  /**
   * Desactiva un flujo
   */
  @Post(':flowId/deactivate')
  async deactivateFlow(@Param('flowId') flowId: string) {
    return this.flowsService.deactivateFlow(flowId);
  }

  /**
   * Elimina un flujo
   */
  @Delete(':flowId')
  async deleteFlow(@Param('flowId') flowId: string) {
    return this.flowsService.deleteFlow(flowId);
  }

  /**
   * Obtiene logs de ejecución de un flujo
   */
  @Get(':flowId/executions')
  async getFlowExecutionLogs(
    @Param('flowId') flowId: string,
    @Query('limit') limit?: string,
  ) {
    return this.flowsService.getFlowExecutionLogs(flowId, limit ? parseInt(limit) : 50);
  }
}
