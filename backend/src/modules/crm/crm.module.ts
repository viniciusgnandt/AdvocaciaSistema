import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Oportunidade, OportunidadeSchema } from './schemas/oportunidade.schema';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Oportunidade.name, schema: OportunidadeSchema }])],
  controllers: [CrmController],
  providers: [CrmService],
})
export class CrmModule {}
