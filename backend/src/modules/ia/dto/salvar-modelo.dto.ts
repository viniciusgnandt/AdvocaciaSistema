import { IsString, MinLength } from 'class-validator';

export class SalvarModeloDto {
  @IsString()
  @MinLength(2)
  nome: string;

  @IsString()
  @MinLength(3)
  tipo_documento: string;

  @IsString()
  @MinLength(5)
  conteudo: string;
}
