/* eslint-disable no-console */
import 'reflect-metadata';
import { config } from 'dotenv';
config();

import mongoose, { Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';

/**
 * Cria (ou garante) o Tenant e o usuario admin para o tenant ja usado por todos os
 * dados de teste ate agora (DEFAULT_TENANT_ID), em vez de criar um tenant novo via
 * /auth/registro - senao a Dra. Acsa logaria numa conta vazia, sem ver nada do que
 * ja foi populado (publicacoes, processos, clientes).
 * Uso: npm run criar:usuario-tenant-existente
 */
async function main() {
  const tenantId = process.env.DEFAULT_TENANT_ID ?? '000000000000000000000001';
  const email = process.argv[2] ?? 'acsa@trilva.com.br';
  const senha = process.argv[3] ?? 'trocarSenha123';
  const nome = process.argv[4] ?? 'Acsa do Carmo de Carlis';

  await mongoose.connect(process.env.MONGO_URI ?? 'mongodb://localhost:27017/trilva');
  const tenants = mongoose.connection.collection('tenants');
  const usuarios = mongoose.connection.collection('usuarios');

  const tenantObjectId = new Types.ObjectId(tenantId);

  const tenantExistente = await tenants.findOne({ _id: tenantObjectId });
  if (!tenantExistente) {
    await tenants.insertOne({
      _id: tenantObjectId,
      nome_escritorio: 'Escritório Acsa do Carmo de Carlis',
      status: 'ativo',
      created_at: new Date(),
      updated_at: new Date(),
    });
    console.log('Tenant criado.');
  } else {
    console.log('Tenant ja existia.');
  }

  const usuarioExistente = await usuarios.findOne({ email });
  if (usuarioExistente) {
    console.log(`Usuario ${email} ja existe (tenant ${usuarioExistente.tenant_id}).`);
    await mongoose.disconnect();
    return;
  }

  const senha_hash = await bcrypt.hash(senha, 12);
  await usuarios.insertOne({
    tenant_id: tenantObjectId,
    nome,
    email,
    senha_hash,
    perfil: 'admin',
    oab: '436184/SP',
    status: 'ativo',
    created_at: new Date(),
    updated_at: new Date(),
  });

  console.log(`\nUsuario criado com sucesso:`);
  console.log(`  email: ${email}`);
  console.log(`  senha: ${senha}`);
  console.log(`  tenant: ${tenantId}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
