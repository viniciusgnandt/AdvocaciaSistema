import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

export class CriarClienteDto {
  @ApiProperty({ enum: ['pf', 'pj'] })
  @IsIn(['pf', 'pj'])
  tipo: 'pf' | 'pj';

  @ApiProperty()
  @IsString()
  nome: string;

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
}
