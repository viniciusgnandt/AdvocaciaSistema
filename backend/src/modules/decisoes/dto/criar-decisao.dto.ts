import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CriarDecisaoDto {
  @ApiProperty()
  @IsString()
  titulo: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  numero_processo?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cliente_id?: string;
}
