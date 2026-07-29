import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CriarTerceirizacaoDto {
  @ApiProperty({ enum: ['correspondente', 'peticao', 'sustentacao_oral', 'audiencia', 'outro'] })
  @IsIn(['correspondente', 'peticao', 'sustentacao_oral', 'audiencia', 'outro'])
  tipo_servico: 'correspondente' | 'peticao' | 'sustentacao_oral' | 'audiencia' | 'outro';

  @ApiProperty()
  @IsString()
  contratante: string;

  @ApiProperty()
  @IsString()
  descricao: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  numero_processo?: string;

  @ApiProperty()
  @IsISO8601()
  data_compromisso: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  valor?: number;
}
