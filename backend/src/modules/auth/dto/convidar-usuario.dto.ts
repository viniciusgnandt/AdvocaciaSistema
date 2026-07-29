import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class ConvidarUsuarioDto {
  @ApiProperty()
  @IsString()
  nome: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  senha: string;

  @ApiProperty({ enum: ['admin', 'advogado', 'assistente'] })
  @IsIn(['admin', 'advogado', 'assistente'])
  perfil: 'admin' | 'advogado' | 'assistente';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  oab?: string;
}
