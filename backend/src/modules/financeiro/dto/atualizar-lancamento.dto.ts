import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class AtualizarLancamentoDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  valor?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  categoria?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsISO8601()
  data_vencimento?: string;

  @ApiProperty({ required: false, enum: ['pendente', 'pago', 'atrasado', 'cancelado'] })
  @IsOptional()
  @IsIn(['pendente', 'pago', 'atrasado', 'cancelado'])
  status?: 'pendente' | 'pago' | 'atrasado' | 'cancelado';
}
