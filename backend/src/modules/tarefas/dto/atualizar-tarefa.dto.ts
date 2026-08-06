import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn, IsISO8601, IsOptional, IsString } from 'class-validator';

export class AtualizarTarefaDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  titulo?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsISO8601()
  data_vencimento?: string;

  @ApiProperty({ required: false, enum: ['baixa', 'media', 'alta', 'critica'] })
  @IsOptional()
  @IsIn(['baixa', 'media', 'alta', 'critica'])
  prioridade?: 'baixa' | 'media' | 'alta' | 'critica';

  @ApiProperty({ required: false, enum: ['pendente', 'em_andamento', 'concluida', 'atrasada'] })
  @IsOptional()
  @IsIn(['pendente', 'em_andamento', 'concluida', 'atrasada'])
  status?: 'pendente' | 'em_andamento' | 'concluida' | 'atrasada';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  responsavel_id?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  responsaveis_adicionais?: string[];

  @ApiProperty({ required: false, description: 'Numero CNJ do processo vinculado, ou string vazia para desvincular' })
  @IsOptional()
  @IsString()
  numero_processo?: string;

  @ApiProperty({ required: false, enum: ['diaria', 'semanal', 'mensal', 'anual'], description: 'string vazia remove a recorrencia' })
  @IsOptional()
  @IsIn(['diaria', 'semanal', 'mensal', 'anual', ''])
  recorrencia?: 'diaria' | 'semanal' | 'mensal' | 'anual' | '';
}
