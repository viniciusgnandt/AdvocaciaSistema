import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AtualizarPerfilDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nome?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  oab?: string;
}
