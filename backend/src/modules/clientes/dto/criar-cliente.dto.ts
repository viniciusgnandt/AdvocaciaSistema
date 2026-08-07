import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import { EhCpfOuCnpjValido } from '../../../common/decorators/eh-documento-valido.decorator';

export type EnderecoDto = {
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
};

export class CriarClienteDto {
  @ApiProperty({ enum: ['pf', 'pj'] })
  @IsIn(['pf', 'pj'])
  tipo: 'pf' | 'pj';

  @ApiProperty()
  @IsString()
  nome: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @EhCpfOuCnpjValido()
  cpf?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @EhCpfOuCnpjValido()
  cnpj?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  telefone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  whatsapp?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  profissao?: string;

  @ApiProperty({ required: false, enum: ['solteiro', 'casado', 'divorciado', 'viuvo', 'uniao_estavel'] })
  @IsOptional()
  @IsIn(['solteiro', 'casado', 'divorciado', 'viuvo', 'uniao_estavel'])
  estado_civil?: string;

  @ApiProperty({ required: false, description: 'Data de nascimento (YYYY-MM-DD), apenas para clientes pessoa física' })
  @IsOptional()
  @IsString()
  data_nascimento?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  razao_social?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nome_fantasia?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  observacoes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  endereco?: EnderecoDto;

  @ApiProperty({ required: false, description: 'ID de outro cliente que indicou este ao escritorio' })
  @IsOptional()
  @IsString()
  indicado_por_id?: string;
}
