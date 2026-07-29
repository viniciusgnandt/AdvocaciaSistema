import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Processo, ProcessoSchema } from './schemas/processo.schema';
import { DatajudConnectorService } from './connectors/datajud-connector.service';
import { ProcessosController } from './processos.controller';
import { ProcessosService } from './processos.service';

@Module({
  imports: [HttpModule, MongooseModule.forFeature([{ name: Processo.name, schema: ProcessoSchema }])],
  controllers: [ProcessosController],
  providers: [DatajudConnectorService, ProcessosService],
  exports: [DatajudConnectorService, ProcessosService],
})
export class ProcessosModule {}
