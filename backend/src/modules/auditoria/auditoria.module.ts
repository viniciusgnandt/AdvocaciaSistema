import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LogAuditoria, LogAuditoriaSchema } from './schemas/log-auditoria.schema';
import { AuditoriaService } from './auditoria.service';
import { AuditoriaController } from './auditoria.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: LogAuditoria.name, schema: LogAuditoriaSchema }])],
  controllers: [AuditoriaController],
  providers: [AuditoriaService],
  exports: [AuditoriaService],
})
export class AuditoriaModule {}
