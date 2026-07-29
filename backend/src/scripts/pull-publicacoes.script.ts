/* eslint-disable no-console */
import 'reflect-metadata';
import { config } from 'dotenv';
config();

import mongoose, { Types } from 'mongoose';
import axios from 'axios';
import { hashDedupe, mapDjenItemToPublicacao } from '../modules/publicacoes/publicacoes.util';

/**
 * Script standalone para validar a ingestao do DJEN sem precisar subir o Nest inteiro.
 * Uso:
 *   npm run seed:publicacoes:dje -- --oab 123456 --uf SP
 *   npm run seed:publicacoes:dje -- --processo 0001234-12.2024.8.26.0100
 */
async function main() {
  const args = parseArgs(process.argv.slice(2)) as Record<string, string>;
  const baseUrl = process.env.DJEN_API_BASE_URL ?? 'https://comunicaapi.pje.jus.br/api/v1';
  const tenantId = process.env.DEFAULT_TENANT_ID ?? '000000000000000000000001';
  const hoje = new Date().toISOString().slice(0, 10);

  const params: Record<string, string> = {
    dataDisponibilizacaoInicio: args.dataInicio ?? hoje,
    dataDisponibilizacaoFim: args.dataFim ?? hoje,
    itensPorPagina: '100',
    pagina: '1',
  };
  if (args.oab) params.numeroOab = args.oab;
  if (args.uf) params.ufOab = args.uf;
  if (args.processo) params.numeroProcesso = args.processo;

  if (!args.oab && !args.processo) {
    console.error('Informe --oab <numero> --uf <UF> ou --processo <numero-cnj>');
    process.exit(1);
  }

  console.log(`Consultando DJEN: ${baseUrl}/comunicacao`, params);
  const { data } = await axios.get(`${baseUrl}/comunicacao`, { params, timeout: 15_000 });
  const items = data.items ?? [];
  console.log(`Retornadas ${items.length} comunicacoes.`);

  if (args.persist) {
    await mongoose.connect(process.env.MONGO_URI ?? 'mongodb://localhost:27017/trilva');
    const Publicacao = mongoose.connection.collection('publicacaos');
    let novas = 0;
    for (const item of items) {
      const mapeada = mapDjenItemToPublicacao(item);
      try {
        await Publicacao.insertOne({
          ...mapeada,
          tenant_id: new Types.ObjectId(tenantId),
          status: 'nao_lida',
          urgencia: 'media',
          tags: [],
          created_at: new Date(),
          updated_at: new Date(),
        });
        novas += 1;
      } catch (err: unknown) {
        if (!isDuplicateKeyError(err)) throw err;
      }
    }
    console.log(`Persistidas ${novas} publicacoes novas (duplicadas ignoradas via hash_dedupe).`);
    await mongoose.disconnect();
  } else {
    for (const item of items.slice(0, 5)) {
      console.log('---');
      console.log(mapDjenItemToPublicacao(item));
    }
    console.log('\n(rode com --persist para gravar no MongoDB)');
  }
}

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        out[key] = next;
        i += 1;
      } else {
        out[key] = true;
      }
    }
  }
  return out;
}

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code: number }).code === 11000;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// referenciado para nao ficar "unused" em builds que nao chamam persist diretamente
void hashDedupe;
