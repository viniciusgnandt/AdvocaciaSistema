import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

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
  cpf?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
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
}
