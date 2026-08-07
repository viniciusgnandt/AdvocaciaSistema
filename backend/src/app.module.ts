import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './modules/auth/auth.module';
import { PublicacoesModule } from './modules/publicacoes/publicacoes.module';
import { ProcessosModule } from './modules/processos/processos.module';
import { TarefasModule } from './modules/tarefas/tarefas.module';
import { DocumentosModule } from './modules/documentos/documentos.module';
import { ClientesModule } from './modules/clientes/clientes.module';
import { FinanceiroModule } from './modules/financeiro/financeiro.module';
import { TerceirizacoesModule } from './modules/terceirizacoes/terceirizacoes.module';
import { ExportacaoModule } from './modules/exportacao/exportacao.module';
import { PrazosModule } from './modules/prazos/prazos.module';
import { AuditoriaModule } from './modules/auditoria/auditoria.module';
import { PortalModule } from './modules/portal/portal.module';
import { HealthModule } from './modules/health/health.module';
import { MetasModule } from './modules/metas/metas.module';
import { ChecklistsModule } from './modules/checklists/checklists.module';
import { NotasModule } from './modules/notas/notas.module';
import { DecisoesModule } from './modules/decisoes/decisoes.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGO_URI ?? 'mongodb://localhost:27017/trilva'),
    ScheduleModule.forRoot(),
    AuthModule,
    PublicacoesModule,
    ProcessosModule,
    TarefasModule,
    DocumentosModule,
    ClientesModule,
    FinanceiroModule,
    TerceirizacoesModule,
    ExportacaoModule,
    PrazosModule,
    AuditoriaModule,
    PortalModule,
    HealthModule,
    MetasModule,
    ChecklistsModule,
    NotasModule,
    DecisoesModule,
  ],
})
export class AppModule {}
