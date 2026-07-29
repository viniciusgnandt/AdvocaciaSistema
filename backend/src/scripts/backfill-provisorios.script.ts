/* eslint-disable no-console */
import 'reflect-metadata';
import { config } from 'dotenv';
config();

import mongoose, { Types } from 'mongoose';
import { normalizarTituloCase } from '../common/texto.util';

/**
 * Backfill unico: cria/completa um registro provisorio de Processo a partir das
 * publicacoes existentes. Agrega dados de TODAS as publicacoes de cada numero_processo
 * (nao so a mais recente) - uma publicacao pode ser so um aviso de distribuicao sem
 * nome de parte, enquanto outra do mesmo processo tem o RECLAMANTE/RECLAMADO completo.
 * Dai em diante o gancho automatico na ingestao ja cuida disso sozinho.
 * Uso: npm run backfill:provisorios
 */
async function main() {
  const tenantId = process.env.DEFAULT_TENANT_ID ?? '000000000000000000000001';
  await mongoose.connect(process.env.MONGO_URI ?? 'mongodb://localhost:27017/trilva');
  const publicacoes = mongoose.connection.collection('publicacaos');
  const processos = mongoose.connection.collection('processos');

  type Agregado = { tribunal?: string; classe?: string; parte_ativa?: string; parte_passiva?: string };
  const porNumero = new Map<string, Agregado>();

  const cursor = publicacoes.find({ tenant_id: new Types.ObjectId(tenantId) });
  for await (const pub of cursor) {
    const numero = pub.numero_processo as string;
    const atual = porNumero.get(numero) ?? {};
    if (!atual.tribunal && pub.tribunal) atual.tribunal = pub.tribunal;
    if (!atual.classe && pub.classe_processual) atual.classe = pub.classe_processual;
    if (!atual.parte_ativa && pub.parte_ativa) atual.parte_ativa = pub.parte_ativa;
    if (!atual.parte_passiva && pub.parte_passiva) atual.parte_passiva = pub.parte_passiva;
    porNumero.set(numero, atual);
  }

  const existentes = await processos
    .find({ tenant_id: new Types.ObjectId(tenantId) }, { projection: { numero_cnj: 1, provisorio: 1, parte_ativa: 1 } })
    .toArray();
  const mapaExistentes = new Map(existentes.map((p) => [p.numero_cnj as string, p]));

  let criados = 0;
  let completados = 0;

  for (const [numero, dados] of porNumero) {
    const existente = mapaExistentes.get(numero);
    const classeNormalizada = normalizarTituloCase(dados.classe);

    if (!existente) {
      await processos.insertOne({
        tenant_id: new Types.ObjectId(tenantId),
        numero_cnj: numero,
        tribunal: dados.tribunal,
        classe: classeNormalizada,
        parte_ativa: dados.parte_ativa,
        parte_passiva: dados.parte_passiva,
        status: 'ativo',
        provisorio: true,
        movimentacoes: [],
        assuntos: [],
        created_at: new Date(),
        updated_at: new Date(),
      });
      console.log(`  [criado] ${dados.tribunal} ${numero} - ${dados.parte_ativa ?? 'sem nome'}`);
      criados += 1;
      continue;
    }

    // processo (provisorio ou definitivo) ja existe mas ficou sem nome - completa so o que falta
    if (existente.provisorio && !existente.parte_ativa && (dados.parte_ativa || dados.parte_passiva)) {
      await processos.updateOne(
        { _id: existente._id },
        { $set: { parte_ativa: dados.parte_ativa, parte_passiva: dados.parte_passiva } },
      );
      console.log(`  [completado] ${numero} - ${dados.parte_ativa ?? '(so passiva)'}`);
      completados += 1;
    }
  }

  console.log(`\nConcluido: ${criados} processos provisorios criados, ${completados} completados com nome.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
