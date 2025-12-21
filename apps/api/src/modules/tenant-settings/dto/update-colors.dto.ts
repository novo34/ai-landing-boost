import { IsString, IsOptional, Matches } from 'class-validator';

export class UpdateColorsDto {
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'primaryColor must be a valid hex color (#RRGGBB)',
  })
  primaryColor?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'secondaryColor must be a valid hex color (#RRGGBB)',
  })
  secondaryColor?: string;
}
