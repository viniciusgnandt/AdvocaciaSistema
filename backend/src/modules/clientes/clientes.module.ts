import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Cliente, ClienteSchema } from './schemas/cliente.schema';
import { Processo, ProcessoSchema } from '../processos/schemas/processo.schema';
import { Documento, DocumentoSchema } from '../documentos/schemas/documento.schema';
import { ClientesController } from './clientes.controller';
import { ClientesService } from './clientes.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Cliente.name, schema: ClienteSchema },
      { name: Processo.name, schema: ProcessoSchema },
      { name: Documento.name, schema: DocumentoSchema },
    ]),
  ],
  controllers: [ClientesController],
  providers: [ClientesService],
})
export class ClientesModule {}
