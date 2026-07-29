import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class AtualizarTerceirizacaoDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsISO8601()
  data_compromisso?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  valor?: number;

  @ApiProperty({ required: false, enum: ['pendente', 'concluido', 'cancelado'] })
  @IsOptional()
  @IsIn(['pendente', 'concluido', 'cancelado'])
  status?: 'pendente' | 'concluido' | 'cancelado';
}
