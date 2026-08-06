import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength } from 'class-validator';

export class CriarNotaDto {
  @ApiProperty({ enum: ['processo', 'cliente'] })
  @IsIn(['processo', 'cliente'])
  entidade: 'processo' | 'cliente';

  @ApiProperty()
  @IsString()
  entidade_id: string;

  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  texto: string;
}
