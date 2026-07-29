import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsOptional, IsString } from 'class-validator';

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
}
