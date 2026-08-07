import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Processo, ProcessoSchema } from '../processos/schemas/processo.schema';
import { Cliente, ClienteSchema } from '../clientes/schemas/cliente.schema';
import { Tenant, TenantSchema } from '../auth/schemas/tenant.schema';
import { ModeloDocumento, ModeloDocumentoSchema } from './schemas/modelo-documento.schema';
import { IaTransacao, IaTransacaoSchema } from './schemas/ia-transacao.schema';
import { IaController } from './ia.controller';
import { IaService } from './ia.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Processo.name, schema: ProcessoSchema },
      { name: Cliente.name, schema: ClienteSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: ModeloDocumento.name, schema: ModeloDocumentoSchema },
      { name: IaTransacao.name, schema: IaTransacaoSchema },
    ]),
  ],
  controllers: [IaController],
  providers: [IaService],
})
export class IaModule {}
