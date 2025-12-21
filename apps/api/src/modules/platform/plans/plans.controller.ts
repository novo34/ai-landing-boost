import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { PlansService } from './plans.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PlatformGuard } from '../../../common/guards/platform.guard';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Controller('platform/plans')
@UseGuards(JwtAuthGuard, PlatformGuard)
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  /**
   * Crea un nuevo plan
   */
  @Post()
  async createPlan(@Body() dto: CreatePlanDto) {
    return this.plansService.createPlan(dto);
  }

  /**
   * Lista todos los planes
   */
  @Get()
  async listPlans() {
    return this.plansService.listPlans();
  }

  /**
   * Obtiene métricas de planes
   */
  @Get('metrics')
  async getPlansMetrics() {
    return this.plansService.getPlansMetrics();
  }

  /**
   * Obtiene detalles de un plan
   */
  @Get(':planId')
  async getPlanDetails(@Param('planId') planId: string) {
    return this.plansService.getPlanDetails(planId);
  }

  /**
   * Actualiza un plan
   */
  @Put(':planId')
  async updatePlan(
    @Param('planId') planId: string,
    @Body() dto: UpdatePlanDto,
  ) {
    return this.plansService.updatePlan(planId, dto);
  }

  /**
   * Elimina un plan
   */
  @Delete(':planId')
  async deletePlan(@Param('planId') planId: string) {
    return this.plansService.deletePlan(planId);
  }
}
