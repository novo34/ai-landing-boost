import { IsString, IsOptional, IsNumberString, Matches } from 'class-validator';

export class SearchQueryDto {
  @IsString()
  q: string;

  @IsOptional()
  @IsString()
  @Matches(/^(conversations|messages|appointments|agents|knowledge)(,(conversations|messages|appointments|agents|knowledge))*$/, {
    message: 'types must be comma-separated list of: conversations, messages, appointments, agents, knowledge',
  })
  types?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}
