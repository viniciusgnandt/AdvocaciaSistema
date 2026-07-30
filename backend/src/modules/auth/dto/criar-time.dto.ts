import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class CriarTimeDto {
  @ApiProperty()
  @IsString()
  nome: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cor?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  membros?: string[];
}
