import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsInt, IsNumber, IsOptional, IsPositive, IsString, Max, Min } from 'class-validator';

export class CriarLancamentoDto {
  @ApiProperty({ enum: ['receita', 'despesa'] })
  @IsIn(['receita', 'despesa'])
  tipo: 'receita' | 'despesa';

  @ApiProperty()
  @IsString()
  descricao: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  valor: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  categoria?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  clienteId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  numero_processo?: string;

  @ApiProperty()
  @IsISO8601()
  data_vencimento: string;

  @ApiProperty({ required: false, description: 'Numero de parcelas (>=2). Cada parcela usa o valor informado, com vencimento mensal a partir de data_vencimento.' })
  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(60)
  parcelas?: number;
}
