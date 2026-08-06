import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Cliente, ClienteSchema } from './schemas/cliente.schema';
import { Processo, ProcessoSchema } from '../processos/schemas/processo.schema';
import { Documento, DocumentoSchema } from '../documentos/schemas/documento.schema';
import { ClientesController } from './clientes.controller';
import { ClientesService } from './clientes.service';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Cliente.name, schema: ClienteSchema },
      { name: Processo.name, schema: ProcessoSchema },
      { name: Documento.name, schema: DocumentoSchema },
    ]),
    AuditoriaModule,
  ],
  controllers: [ClientesController],
  providers: [ClientesService],
})
export class ClientesModule {}
