import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly conexao: Connection) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Status de disponibilidade da API e do banco de dados' })
  verificar() {
    // readyState: 0 desconectado, 1 conectado, 2 conectando, 3 desconectando
    const bancoOk = this.conexao.readyState === 1;
    return {
      status: bancoOk ? 'ok' : 'degradado',
      banco: bancoOk ? 'conectado' : 'indisponivel',
      timestamp: new Date().toISOString(),
    };
  }
}
