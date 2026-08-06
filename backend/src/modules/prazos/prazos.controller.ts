import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { somarDiasCorridos, somarDiasUteis } from '../../common/calendario-forense.util';

class CalcularPrazoDto {
  @ApiProperty()
  @IsString()
  data_inicial: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  dias: number;

  @ApiProperty({ enum: ['uteis', 'corridos'] })
  @IsIn(['uteis', 'corridos'])
  tipo: 'uteis' | 'corridos';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  considerar_recesso?: boolean;
}

class CalcularAtualizacaoDto {
  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  valor: number;

  @ApiProperty()
  @IsString()
  data_inicial: string;

  @ApiProperty()
  @IsString()
  data_final: string;

  @ApiProperty({ description: 'Correcao monetaria mensal, em % (ex.: 0.5 para 0,5% ao mes)' })
  @IsNumber()
  @Min(0)
  indice_mensal: number;

  @ApiProperty({ required: false, description: 'Juros mensais, em % (ex.: 1 para 1% ao mes)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  juros_mensal?: number;

  @ApiProperty({ required: false, enum: ['simples', 'composto'] })
  @IsOptional()
  @IsIn(['simples', 'composto'])
  tipo_juros?: 'simples' | 'composto';
}

@ApiTags('prazos')
@Controller('prazos')
export class PrazosController {
  @Post('calcular')
  @ApiOperation({ summary: 'Calcula a data fatal de um prazo, considerando feriados nacionais e recesso forense' })
  calcular(@Body() dto: CalcularPrazoDto) {
    const dataInicial = new Date(dto.data_inicial);
    if (Number.isNaN(dataInicial.getTime())) throw new BadRequestException('data_inicial invalida');
    if (!dto.dias || dto.dias <= 0) throw new BadRequestException('informe um numero de dias maior que zero');

    const opts = { considerarRecesso: dto.considerar_recesso !== false };
    const dataFatal =
      dto.tipo === 'corridos' ? somarDiasCorridos(dataInicial, dto.dias, opts) : somarDiasUteis(dataInicial, dto.dias, opts);

    return { data_fatal: dataFatal };
  }

  @Post('calcular-atualizacao-monetaria')
  @ApiOperation({
    summary: 'Aplica correcao monetaria + juros (simples ou composto) mensais sobre um valor entre duas datas',
  })
  calcularAtualizacao(@Body() dto: CalcularAtualizacaoDto) {
    const dataInicial = new Date(dto.data_inicial);
    const dataFinal = new Date(dto.data_final);
    if (Number.isNaN(dataInicial.getTime()) || Number.isNaN(dataFinal.getTime())) {
      throw new BadRequestException('data_inicial/data_final invalida');
    }
    if (dataFinal < dataInicial) throw new BadRequestException('data_final deve ser posterior a data_inicial');

    // meses "cheios" de calendario entre as duas datas - convencao usual de tabelas de
    // atualizacao judicial (ex.: TJSP), sem fracionar por dias dentro do mes
    const mesesCorrigido = Math.max(
      0,
      (dataFinal.getFullYear() - dataInicial.getFullYear()) * 12 + (dataFinal.getMonth() - dataInicial.getMonth()),
    );

    const taxaIndice = dto.indice_mensal / 100;
    const valorCorrigido = dto.valor * (1 + taxaIndice * mesesCorrigido);

    const taxaJuros = (dto.juros_mensal ?? 0) / 100;
    const valorComJuros =
      dto.tipo_juros === 'composto'
        ? valorCorrigido * Math.pow(1 + taxaJuros, mesesCorrigido)
        : valorCorrigido * (1 + taxaJuros * mesesCorrigido);

    return {
      meses: mesesCorrigido,
      valor_original: dto.valor,
      valor_corrigido: Number(valorCorrigido.toFixed(2)),
      valor_final: Number(valorComJuros.toFixed(2)),
      juros_aplicados: Number((valorComJuros - valorCorrigido).toFixed(2)),
      correcao_aplicada: Number((valorCorrigido - dto.valor).toFixed(2)),
    };
  }
}
