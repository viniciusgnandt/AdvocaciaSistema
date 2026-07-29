import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class AtualizarOportunidadeDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  titulo?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  valor_estimado?: number;

  @ApiProperty({ required: false, enum: ['novo', 'contato', 'proposta', 'negociacao', 'ganho', 'perdido'] })
  @IsOptional()
  @IsIn(['novo', 'contato', 'proposta', 'negociacao', 'ganho', 'perdido'])
  etapa?: 'novo' | 'contato' | 'proposta' | 'negociacao' | 'ganho' | 'perdido';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  responsavel_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notas?: string;
}
