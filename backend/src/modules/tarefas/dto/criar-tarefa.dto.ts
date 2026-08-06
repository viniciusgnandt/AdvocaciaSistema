import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn, IsISO8601, IsOptional, IsString } from 'class-validator';

export class CriarTarefaDto {
  @ApiProperty()
  @IsString()
  titulo: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  publicacao_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  numero_processo?: string;

  @ApiProperty()
  @IsISO8601()
  data_vencimento: string;

  @ApiProperty({ required: false, enum: ['baixa', 'media', 'alta', 'critica'] })
  @IsOptional()
  @IsIn(['baixa', 'media', 'alta', 'critica'])
  prioridade?: 'baixa' | 'media' | 'alta' | 'critica';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  responsavel_id?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  responsaveis_adicionais?: string[];

  @ApiProperty({ required: false, enum: ['diaria', 'semanal', 'mensal', 'anual'] })
  @IsOptional()
  @IsIn(['diaria', 'semanal', 'mensal', 'anual'])
  recorrencia?: 'diaria' | 'semanal' | 'mensal' | 'anual';
}
