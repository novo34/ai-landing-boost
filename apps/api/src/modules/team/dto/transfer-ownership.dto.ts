import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class TransferOwnershipDto {
  @IsString()
  @IsNotEmpty()
  newOwnerId: string;

  @IsString()
  @IsOptional()
  confirmationCode?: string;
}

