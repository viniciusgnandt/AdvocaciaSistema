import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegistrarEscritorioDto {
  @ApiProperty()
  @IsString()
  nome_escritorio: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cnpj?: string;

  @ApiProperty()
  @IsString()
  nome_admin: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  senha: string;
}
