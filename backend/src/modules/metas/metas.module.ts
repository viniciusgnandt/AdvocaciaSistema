import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Meta, MetaSchema } from './schemas/meta.schema';
import { MetasController } from './metas.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Meta.name, schema: MetaSchema }])],
  controllers: [MetasController],
})
export class MetasModule {}
