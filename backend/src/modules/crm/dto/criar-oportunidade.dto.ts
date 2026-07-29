import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CriarOportunidadeDto {
  @ApiProperty()
  @IsString()
  titulo: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  clienteId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cliente_nome?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  valor_estimado?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  responsavel_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notas?: string;
}
