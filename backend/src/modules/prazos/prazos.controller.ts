import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
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
}
