import { Transform } from 'class-transformer';
import { IsBoolean, IsMongoId, IsOptional, IsString, MinLength } from 'class-validator';

export class GerarDocumentoDto {
  @IsString()
  @MinLength(3)
  tipo_documento: string; // ex.: "Petição inicial", "Contestação", "Notificação extrajudicial"

  @IsOptional()
  @IsMongoId()
  processo_id?: string;

  @IsOptional()
  @IsMongoId()
  cliente_id?: string;

  @IsString()
  @MinLength(5)
  instrucoes: string;

  // vem como string "true"/"false" no multipart/form-data
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  buscar_jurisprudencia?: boolean;
}
