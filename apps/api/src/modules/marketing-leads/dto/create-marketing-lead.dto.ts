import { IsString, IsEmail, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class CreateMarketingLeadDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsString()
  locale: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  utmSource?: string;

  @IsOptional()
  @IsString()
  utmMedium?: string;

  @IsOptional()
  @IsString()
  utmCampaign?: string;

  // Datos de ROI (opcionales, solo si viene de calculadora)
  @IsOptional()
  @IsNumber()
  numPeople?: number;

  @IsOptional()
  @IsNumber()
  hoursPerWeek?: number;

  @IsOptional()
  @IsNumber()
  hourlyCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  automationRate?: number;

  @IsOptional()
  @IsNumber()
  yearlyHours?: number;

  @IsOptional()
  @IsNumber()
  currentYearlyCost?: number;

  @IsOptional()
  @IsNumber()
  estimatedSavings?: number;

  @IsOptional()
  @IsNumber()
  projectBudgetMin?: number;

  @IsOptional()
  @IsNumber()
  projectBudgetMax?: number;

  @IsOptional()
  @IsNumber()
  monthlyRetainer?: number;
}

