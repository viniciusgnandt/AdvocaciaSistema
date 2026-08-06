import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Nota, NotaSchema } from './schemas/nota.schema';
import { Usuario, UsuarioSchema } from '../auth/schemas/usuario.schema';
import { NotasController } from './notas.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Nota.name, schema: NotaSchema },
      { name: Usuario.name, schema: UsuarioSchema },
    ]),
  ],
  controllers: [NotasController],
})
export class NotasModule {}
