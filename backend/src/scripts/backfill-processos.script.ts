/* eslint-disable no-console */
import 'reflect-metadata';
import { config } from 'dotenv';
config();

import mongoose, { Types } from 'mongoose';
import axios from 'axios';
import { mapDatajudToProcesso } from '../modules/processos/processos.util';

/**
 * Backfill unico: enriquece via DataJud os processos que ja tinhamos em `publicacoes`
 * antes do gancho automatico (ProcessosService.enriquecerEmBackground) existir. Dai em
 * diante toda publicacao nova ja dispara o enriquecimento sozinha - este script nao
 * fica agendado nem faz parte do fluxo normal da aplicacao.
 *
 * Uso: npm run backfill:processos
 */
async function main() {
  const tenantId = process.env.DEFAULT_TENANT_ID ?? '000000000000000000000001';
  const baseUrl = process.env.DATAJUD_BASE_URL ?? 'https://api-publica.datajud.cnj.jus.br';
  const apiKey = process.env.DATAJUD_API_KEY;
  if (!apiKey) {
    console.error('DATAJUD_API_KEY nao configurada no .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI ?? 'mongodb://localhost:27017/trilva');
  const publicacoes = mongoose.connection.collection('publicacaos');
  const processos = mongoose.connection.collection('processos');

  const pares = await publicacoes
    .aggregate([
      { $match: { tenant_id: new Types.ObjectId(tenantId) } },
      { $group: { _id: { numero_processo: '$numero_processo', tribunal: '$tribunal' } } },
    ])
    .toArray();

  console.log(`${pares.length} processos distintos a verificar.`);

  let encontrados = 0;
  let naoEncontrados = 0;

  for (const par of pares) {
    const { numero_processo: numeroProcesso, tribunal } = par._id as { numero_processo: string; tribunal: string };
    if (!tribunal || tribunal === 'desconhecido') continue;

    const alias = `api_publica_${tribunal.toLowerCase()}`;
    try {
      const { data } = await axios.post(
        `${baseUrl}/${alias}/_search`,
        { query: { term: { numeroProcesso } } },
        { headers: { Authorization: `APIKey ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 30_000 },
      );
      const fonte = data.hits?.hits?.[0]?._source;
      if (!fonte) {
        naoEncontrados += 1;
        console.log(`  [nao indexado] ${tribunal} ${numeroProcesso}`);
        continue;
      }

      const dados = mapDatajudToProcesso(fonte);
      await processos.updateOne(
        { tenant_id: new Types.ObjectId(tenantId), numero_cnj: numeroProcesso },
        {
          $set: { numero_cnj: numeroProcesso, ...dados, updated_at: new Date() },
          $setOnInsert: { tenant_id: new Types.ObjectId(tenantId), created_at: new Date() },
        },
        { upsert: true },
      );
      encontrados += 1;
      console.log(`  [ok] ${tribunal} ${numeroProcesso} - ${dados.classe ?? 'sem classe'}`);
    } catch (err) {
      console.log(`  [erro] ${tribunal} ${numeroProcesso}: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`\nConcluido: ${encontrados} enriquecidos, ${naoEncontrados} ainda nao indexados no DataJud.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
