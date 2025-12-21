import { IsString, IsNotEmpty } from 'class-validator';

/**
 * DTO para agregar un agente a un canal
 */
export class AddAgentToChannelDto {
  @IsString()
  @IsNotEmpty()
  agentId: string;
}

