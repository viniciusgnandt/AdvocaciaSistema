import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';
import { CATALOGO_PERMISSOES, Permissao } from '../schemas/grupo.schema';

export class CriarGrupoDto {
  @ApiProperty()
  @IsString()
  nome: string;

  @ApiProperty({ required: false, enum: CATALOGO_PERMISSOES, isArray: true })
  @IsOptional()
  @IsArray()
  @IsIn(CATALOGO_PERMISSOES, { each: true })
  permissoes?: Permissao[];
}
