import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Documento, DocumentoSchema } from './schemas/documento.schema';
import { Pasta, PastaSchema } from './schemas/pasta.schema';
import { DocumentosController } from './documentos.controller';
import { PastasController } from './pastas.controller';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    StorageModule,
    MongooseModule.forFeature([
      { name: Documento.name, schema: DocumentoSchema },
      { name: Pasta.name, schema: PastaSchema },
    ]),
  ],
  controllers: [DocumentosController, PastasController],
})
export class DocumentosModule {}
