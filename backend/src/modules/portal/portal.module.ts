import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Cliente, ClienteSchema } from '../clientes/schemas/cliente.schema';
import { Processo, ProcessoSchema } from '../processos/schemas/processo.schema';
import { Documento, DocumentoSchema } from '../documentos/schemas/documento.schema';
import { Lancamento, LancamentoSchema } from '../financeiro/schemas/lancamento.schema';
import { PortalController } from './portal.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Cliente.name, schema: ClienteSchema },
      { name: Processo.name, schema: ProcessoSchema },
      { name: Documento.name, schema: DocumentoSchema },
      { name: Lancamento.name, schema: LancamentoSchema },
    ]),
  ],
  controllers: [PortalController],
})
export class PortalModule {}
