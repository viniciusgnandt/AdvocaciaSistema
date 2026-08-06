import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNumber, IsPositive, IsString, Matches } from 'class-validator';

export class SalvarMetaDto {
  @ApiProperty()
  @IsString()
  usuario_id: string;

  @ApiProperty({ enum: ['faturamento', 'processos_ativos', 'tarefas_concluidas'] })
  @IsIn(['faturamento', 'processos_ativos', 'tarefas_concluidas'])
  metrica: 'faturamento' | 'processos_ativos' | 'tarefas_concluidas';

  @ApiProperty({ description: 'formato YYYY-MM' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  mes: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  valor_meta: number;
}
