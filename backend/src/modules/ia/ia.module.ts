import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Processo, ProcessoSchema } from '../processos/schemas/processo.schema';
import { Cliente, ClienteSchema } from '../clientes/schemas/cliente.schema';
import { ModeloDocumento, ModeloDocumentoSchema } from './schemas/modelo-documento.schema';
import { IaUso, IaUsoSchema } from './schemas/ia-uso.schema';
import { IaController } from './ia.controller';
import { IaService } from './ia.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Processo.name, schema: ProcessoSchema },
      { name: Cliente.name, schema: ClienteSchema },
      { name: ModeloDocumento.name, schema: ModeloDocumentoSchema },
      { name: IaUso.name, schema: IaUsoSchema },
    ]),
  ],
  controllers: [IaController],
  providers: [IaService],
})
export class IaModule {}
