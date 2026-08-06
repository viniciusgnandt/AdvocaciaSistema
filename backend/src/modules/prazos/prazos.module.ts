import { Module } from '@nestjs/common';
import { PrazosController } from './prazos.controller';

@Module({
  controllers: [PrazosController],
})
export class PrazosModule {}
