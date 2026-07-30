/* eslint-disable no-console */
import 'reflect-metadata';
import { config } from 'dotenv';
config();

import mongoose from 'mongoose';
import { decodificarEntidadesHtml } from '../common/texto.util';

/**
 * Correcao pontual (nao roda em nenhum fluxo normal): algumas publicacoes do DJEN vieram
 * com entidades HTML soltas no texto ("Gon&ccedil;alves" em vez de "Gonçalves"), de antes
 * do decodificarEntidadesHtml existir em mapDjenItemToPublicacao. Decodifica o que ja esta
 * salvo em publicacoes (inteiro_teor_texto, parte_ativa, parte_passiva) e processos
 * (parte_ativa, parte_passiva, classe), em todos os tenants.
 * Uso: npm run corrigir:entidades-html
 */
const TEM_ENTIDADE = /&#?\w+;/;

async function main() {
  await mongoose.connect(process.env.MONGO_URI ?? 'mongodb://localhost:27017/trilva');
  const publicacoes = mongoose.connection.collection('publicacaos');
  const processos = mongoose.connection.collection('processos');

  let publicacoesCorrigidas = 0;
  const cursorPub = publicacoes.find({
    $or: [
      { inteiro_teor_texto: { $regex: TEM_ENTIDADE } },
      { parte_ativa: { $regex: TEM_ENTIDADE } },
      { parte_passiva: { $regex: TEM_ENTIDADE } },
    ],
  });
  for await (const doc of cursorPub) {
    const set: Record<string, string> = {};
    if (doc.inteiro_teor_texto) set.inteiro_teor_texto = decodificarEntidadesHtml(doc.inteiro_teor_texto)!;
    if (doc.parte_ativa) set.parte_ativa = decodificarEntidadesHtml(doc.parte_ativa)!;
    if (doc.parte_passiva) set.parte_passiva = decodificarEntidadesHtml(doc.parte_passiva)!;
    await publicacoes.updateOne({ _id: doc._id }, { $set: set });
    publicacoesCorrigidas += 1;
    console.log(`  [publicacao] ${doc.numero_processo} - ${set.parte_ativa ?? set.inteiro_teor_texto?.slice(0, 40)}`);
  }

  let processosCorrigidos = 0;
  const cursorProc = processos.find({
    $or: [
      { parte_ativa: { $regex: TEM_ENTIDADE } },
      { parte_passiva: { $regex: TEM_ENTIDADE } },
      { classe: { $regex: TEM_ENTIDADE } },
    ],
  });
  for await (const doc of cursorProc) {
    const set: Record<string, string> = {};
    if (doc.parte_ativa) set.parte_ativa = decodificarEntidadesHtml(doc.parte_ativa)!;
    if (doc.parte_passiva) set.parte_passiva = decodificarEntidadesHtml(doc.parte_passiva)!;
    if (doc.classe) set.classe = decodificarEntidadesHtml(doc.classe)!;
    await processos.updateOne({ _id: doc._id }, { $set: set });
    processosCorrigidos += 1;
    console.log(`  [processo] ${doc.numero_cnj} -> ${set.parte_ativa ?? doc.numero_cnj}`);
  }

  console.log(`\nConcluido: ${publicacoesCorrigidas} publicacoes e ${processosCorrigidos} processos corrigidos.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
