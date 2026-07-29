/* eslint-disable no-console */
import 'reflect-metadata';
import { config } from 'dotenv';
config();

import mongoose from 'mongoose';
import { normalizarTituloCase } from '../common/texto.util';

/**
 * Backfill unico: corrige a capitalizacao de classe_processual/classe ja gravados no
 * banco antes da normalizacao existir (ex.: "AçãO TRABALHISTA - RITO ORDINáRIO" vindo
 * assim direto do DJEN/DataJud). Dai em diante toda gravacao nova ja sai normalizada.
 * Uso: npm run normalizar:classes
 */
async function main() {
  await mongoose.connect(process.env.MONGO_URI ?? 'mongodb://localhost:27017/trilva');
  const publicacoes = mongoose.connection.collection('publicacaos');
  const processos = mongoose.connection.collection('processos');

  let pubsAtualizadas = 0;
  for await (const pub of publicacoes.find({ classe_processual: { $exists: true, $ne: null } })) {
    const normalizado = normalizarTituloCase(pub.classe_processual);
    if (normalizado !== pub.classe_processual) {
      await publicacoes.updateOne({ _id: pub._id }, { $set: { classe_processual: normalizado } });
      pubsAtualizadas += 1;
    }
  }

  let procsAtualizados = 0;
  for await (const proc of processos.find({ classe: { $exists: true, $ne: null } })) {
    const normalizado = normalizarTituloCase(proc.classe);
    if (normalizado !== proc.classe) {
      await processos.updateOne({ _id: proc._id }, { $set: { classe: normalizado } });
      procsAtualizados += 1;
    }
  }

  console.log(`Publicacoes corrigidas: ${pubsAtualizadas}. Processos corrigidos: ${procsAtualizados}.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
