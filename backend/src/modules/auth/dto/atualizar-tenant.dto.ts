import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AtualizarTenantDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nome_escritorio?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cnpj?: string;
}
