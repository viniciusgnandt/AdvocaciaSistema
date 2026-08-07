import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsMongoId, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';

class HistoricoItemDto {
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  texto: string;
}

export class CopilotoDto {
  @IsOptional()
  @IsMongoId()
  processo_id?: string;

  @IsString()
  @MinLength(3)
  pergunta: string;

  @IsOptional()
  @IsBoolean()
  buscar_jurisprudencia?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HistoricoItemDto)
  historico?: HistoricoItemDto[];
}
