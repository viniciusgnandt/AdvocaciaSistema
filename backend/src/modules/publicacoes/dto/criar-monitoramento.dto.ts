import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

export class CriarMonitoramentoDto {
  @ApiProperty({ enum: ['oab', 'cpf', 'cnpj', 'processo'] })
  @IsIn(['oab', 'cpf', 'cnpj', 'processo'])
  tipo: 'oab' | 'cpf' | 'cnpj' | 'processo';

  @ApiProperty({ description: 'Numero da OAB, CPF, CNPJ ou numero CNJ do processo' })
  @IsString()
  valor: string;

  @ApiProperty({ required: false, description: 'UF da OAB, obrigatorio quando tipo=oab' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2}$/)
  oab_uf?: string;
}
