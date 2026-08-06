import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class DivisaoHonorarioDto {
  @ApiProperty()
  @IsString()
  usuario_id: string;

  @ApiProperty()
  @IsNumber()
  percentual: number;
}

export class HonorariosDto {
  @ApiProperty({ required: false, enum: ['fixo', 'percentual', 'exito', 'misto'] })
  @IsOptional()
  @IsIn(['fixo', 'percentual', 'exito', 'misto'])
  tipo?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  valor_fixo?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  percentual?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  observacoes?: string;

  @ApiProperty({ required: false, type: [DivisaoHonorarioDto] })
  @IsOptional()
  @IsArray()
  divisoes?: DivisaoHonorarioDto[];
}

export class AtualizarProcessoDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fase_processual?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  advogado_parte_contraria?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  observacoes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  honorarios?: HonorariosDto;

  @ApiProperty({ required: false, enum: ['ativo', 'suspenso', 'encerrado', 'arquivado'] })
  @IsOptional()
  @IsIn(['ativo', 'suspenso', 'encerrado', 'arquivado'])
  status?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  responsavel_id?: string;
}
