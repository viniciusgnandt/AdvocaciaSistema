import { IsMongoId, IsOptional, IsString, MinLength } from 'class-validator';

export class CopilotoDto {
  @IsOptional()
  @IsMongoId()
  processo_id?: string;

  @IsString()
  @MinLength(3)
  pergunta: string;
}
