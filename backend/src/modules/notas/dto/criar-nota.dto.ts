import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

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

  @ApiProperty({ required: false, enum: ['ligacao', 'email', 'whatsapp', 'reuniao', 'presencial'] })
  @IsOptional()
  @IsIn(['ligacao', 'email', 'whatsapp', 'reuniao', 'presencial'])
  canal?: 'ligacao' | 'email' | 'whatsapp' | 'reuniao' | 'presencial';
}
