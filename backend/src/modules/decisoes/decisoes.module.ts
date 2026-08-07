import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Decisao, DecisaoSchema } from './schemas/decisao.schema';
import { DecisoesController } from './decisoes.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Decisao.name, schema: DecisaoSchema }])],
  controllers: [DecisoesController],
})
export class DecisoesModule {}
