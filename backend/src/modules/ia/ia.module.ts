import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Processo, ProcessoSchema } from '../processos/schemas/processo.schema';
import { Cliente, ClienteSchema } from '../clientes/schemas/cliente.schema';
import { IaController } from './ia.controller';
import { IaService } from './ia.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Processo.name, schema: ProcessoSchema },
      { name: Cliente.name, schema: ClienteSchema },
    ]),
  ],
  controllers: [IaController],
  providers: [IaService],
})
export class IaModule {}
