import { IsString, IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { $Enums } from '@prisma/client';

export class CreateInvitationDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsEnum($Enums.tenantmembership_role)
  @IsNotEmpty()
  role: $Enums.tenantmembership_role;
}

