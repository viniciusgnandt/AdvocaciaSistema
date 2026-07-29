/* eslint-disable no-console */
import 'reflect-metadata';
import { config } from 'dotenv';
config();

import mongoose, { Types } from 'mongoose';

/**
 * Backfill unico: cria um Cliente para cada `parte_ativa` distinta ja identificada nos
 * processos (normalmente o reclamante - quem o escritorio representa nos casos
 * trabalhistas que temos hoje). O vinculo cliente<->processo e automatico (mesma regra
 * de ClientesService.criar), entao so precisamos criar o registro do cliente.
 *
 * Uso: npm run backfill:clientes
 */
async function main() {
  const tenantId = process.env.DEFAULT_TENANT_ID ?? '000000000000000000000001';
  await mongoose.connect(process.env.MONGO_URI ?? 'mongodb://localhost:27017/trilva');
  const processos = mongoose.connection.collection('processos');
  const clientes = mongoose.connection.collection('clientes');

  const partesAtivas: string[] = await processos.distinct('parte_ativa', {
    tenant_id: new Types.ObjectId(tenantId),
    parte_ativa: { $exists: true, $ne: null },
  });

  console.log(`${partesAtivas.length} partes ativas distintas encontradas nos processos.`);

  let criados = 0;
  let jaExistiam = 0;

  for (const nome of partesAtivas) {
    const nomeNormalizado = nome.trim().replace(/\s+/g, ' ');
    if (!nomeNormalizado) continue;

    const existente = await clientes.findOne({
      tenant_id: new Types.ObjectId(tenantId),
      nome: { $regex: `^${nomeNormalizado.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    });
    if (existente) {
      jaExistiam += 1;
      continue;
    }

    const clienteId = new Types.ObjectId();
    await clientes.insertOne({
      _id: clienteId,
      tenant_id: new Types.ObjectId(tenantId),
      tipo: 'pf',
      nome: nomeNormalizado,
      status: 'ativo',
      tags: [],
      created_at: new Date(),
      updated_at: new Date(),
    });

    // vinculo automatico (mesma logica de ClientesService.vincularProcessosEmBackground)
    const regexExato = new RegExp(`^${nomeNormalizado.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    const resultado = await processos.updateMany(
      {
        tenant_id: new Types.ObjectId(tenantId),
        cliente_id: { $exists: false },
        $or: [{ parte_ativa: regexExato }, { parte_passiva: regexExato }],
      },
      { $set: { cliente_id: clienteId } },
    );

    console.log(`  [ok] ${nomeNormalizado} -> ${resultado.modifiedCount} processo(s) vinculado(s)`);
    criados += 1;
  }

  console.log(`\nConcluido: ${criados} clientes criados, ${jaExistiam} ja existiam.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
