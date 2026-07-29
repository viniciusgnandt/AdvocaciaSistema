/* eslint-disable no-console */
import 'reflect-metadata';
import { config } from 'dotenv';
config();

import mongoose, { Types } from 'mongoose';
import { extrairPartes } from '../modules/publicacoes/publicacoes.util';

/** Backfill unico: extrai reclamante/reclamado do teor das publicacoes ja gravadas
 * e propaga para `publicacoes` e `processos`. Dai em diante o gancho automatico na
 * ingestao (publicacoes-ingestao.service.ts) cuida disso sozinho.
 * Uso: npm run backfill:partes
 */
async function main() {
  const tenantId = process.env.DEFAULT_TENANT_ID ?? '000000000000000000000001';
  await mongoose.connect(process.env.MONGO_URI ?? 'mongodb://localhost:27017/trilva');
  const publicacoes = mongoose.connection.collection('publicacaos');
  const processos = mongoose.connection.collection('processos');

  const cursor = publicacoes.find({ tenant_id: new Types.ObjectId(tenantId) });
  let atualizadas = 0;
  let processosAtualizados = 0;

  for await (const doc of cursor) {
    const partes = extrairPartes(doc.inteiro_teor_texto);
    if (!partes.parte_ativa && !partes.parte_passiva) continue;

    await publicacoes.updateOne({ _id: doc._id }, { $set: partes });
    atualizadas += 1;

    const set: Record<string, string> = {};
    if (partes.parte_ativa) set.parte_ativa = partes.parte_ativa;
    if (partes.parte_passiva) set.parte_passiva = partes.parte_passiva;
    const resultado = await processos.updateOne(
      { tenant_id: new Types.ObjectId(tenantId), numero_cnj: doc.numero_processo },
      { $set: set },
    );
    if (resultado.matchedCount > 0) processosAtualizados += 1;
  }

  console.log(`Publicacoes atualizadas: ${atualizadas}. Processos atualizados: ${processosAtualizados}.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
