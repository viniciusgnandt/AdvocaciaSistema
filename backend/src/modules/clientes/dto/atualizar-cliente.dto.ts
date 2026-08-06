import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import type { EnderecoDto } from './criar-cliente.dto';
import { EhCpfOuCnpjValido } from '../../../common/decorators/eh-documento-valido.decorator';

export class AtualizarClienteDto {
  @ApiProperty({ required: false, enum: ['pf', 'pj'] })
  @IsOptional()
  @IsIn(['pf', 'pj'])
  tipo?: 'pf' | 'pj';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nome?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @EhCpfOuCnpjValido()
  cpf?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @EhCpfOuCnpjValido()
  cnpj?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  telefone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  whatsapp?: string;

  @ApiProperty({ required: false, enum: ['ativo', 'inativo', 'prospect'] })
  @IsOptional()
  @IsIn(['ativo', 'inativo', 'prospect'])
  status?: 'ativo' | 'inativo' | 'prospect';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  profissao?: string;

  @ApiProperty({ required: false, enum: ['solteiro', 'casado', 'divorciado', 'viuvo', 'uniao_estavel'] })
  @IsOptional()
  @IsIn(['solteiro', 'casado', 'divorciado', 'viuvo', 'uniao_estavel'])
  estado_civil?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  razao_social?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nome_fantasia?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  observacoes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  endereco?: EnderecoDto;
}
