import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

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
}
