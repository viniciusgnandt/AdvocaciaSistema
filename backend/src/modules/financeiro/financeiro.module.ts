import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Lancamento, LancamentoSchema } from './schemas/lancamento.schema';
import { FinanceiroController } from './financeiro.controller';
import { FinanceiroService } from './financeiro.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Lancamento.name, schema: LancamentoSchema }])],
  controllers: [FinanceiroController],
  providers: [FinanceiroService],
})
export class FinanceiroModule {}
