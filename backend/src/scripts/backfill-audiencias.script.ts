/* eslint-disable no-console */
import 'reflect-metadata';
import { config } from 'dotenv';
config();

import mongoose, { Types } from 'mongoose';

/** Backfill unico: propaga `audiencia_data` das publicacoes ja classificadas para
 * `processos.proxima_audiencia`, retroativamente. Dai em diante o gancho automatico
 * na ingestao (publicacoes-ingestao.service.ts) cuida disso sozinho a cada publicacao nova.
 * Quando ha mais de uma audiencia para o mesmo processo, usamos a mais recente
 * (maior data), que reflete a ultima designacao/redesignacao encontrada.
 * Uso: npm run backfill:audiencias
 */
async function main() {
  const tenantId = process.env.DEFAULT_TENANT_ID ?? '000000000000000000000001';
  await mongoose.connect(process.env.MONGO_URI ?? 'mongodb://localhost:27017/trilva');
  const publicacoes = mongoose.connection.collection('publicacaos');
  const processos = mongoose.connection.collection('processos');

  const tenantObjectId = new Types.ObjectId(tenantId);

  const cursor = publicacoes.find({ tenant_id: tenantObjectId, audiencia_data: { $exists: true, $ne: null } });

  const maisRecentePorProcesso = new Map<string, Date>();
  for await (const doc of cursor) {
    const numero = doc.numero_processo;
    const data: Date = doc.audiencia_data;
    if (!numero || !data) continue;
    const atual = maisRecentePorProcesso.get(numero);
    if (!atual || data > atual) maisRecentePorProcesso.set(numero, data);
  }

  let processosAtualizados = 0;
  for (const [numero, data] of maisRecentePorProcesso) {
    const resultado = await processos.updateOne(
      { tenant_id: tenantObjectId, numero_cnj: numero },
      { $set: { proxima_audiencia: data } },
    );
    if (resultado.matchedCount > 0) {
      processosAtualizados += 1;
      console.log(`[ok] ${numero} -> ${data.toISOString()}`);
    } else {
      console.log(`[sem processo] ${numero} (publicacao com audiencia mas processo nao encontrado)`);
    }
  }

  console.log(`\nConcluido: ${maisRecentePorProcesso.size} processos com audiencia encontrados, ${processosAtualizados} atualizados.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
