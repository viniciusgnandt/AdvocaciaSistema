import { IsMongoId, IsOptional, IsString, MinLength } from 'class-validator';

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
}
