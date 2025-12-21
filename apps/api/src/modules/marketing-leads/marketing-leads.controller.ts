import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { MarketingLeadsService } from './marketing-leads.service';
import { CreateMarketingLeadDto } from './dto/create-marketing-lead.dto';

@Controller('public/marketing/leads')
export class MarketingLeadsController {
  constructor(private readonly marketingLeadsService: MarketingLeadsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createLeadDto: CreateMarketingLeadDto) {
    // TODO: Implementar rate limiting y protección anti-spam
    // - Rate limiting por IP
    // - Validación de email (verificar dominio válido)
    // - Honeypot fields
    // - reCAPTCHA opcional
    
    try {
      const result = await this.marketingLeadsService.create(createLeadDto);
      return result;
    } catch (error) {
      return {
        success: false,
        error_key: 'marketing_leads.create_error',
        error_params: {},
        data: null,
      };
    }
  }
}

