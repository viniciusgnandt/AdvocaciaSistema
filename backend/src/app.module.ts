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
  ],
})
export class AppModule {}
