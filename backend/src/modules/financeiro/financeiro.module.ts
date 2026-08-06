import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Lancamento, LancamentoSchema } from './schemas/lancamento.schema';
import { FinanceiroController } from './financeiro.controller';
import { FinanceiroService } from './financeiro.service';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: Lancamento.name, schema: LancamentoSchema }]), AuditoriaModule],
  controllers: [FinanceiroController],
  providers: [FinanceiroService],
  exports: [FinanceiroService],
})
export class FinanceiroModule {}
