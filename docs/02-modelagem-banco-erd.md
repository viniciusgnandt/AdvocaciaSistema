# Modelagem de Dados — MongoDB (Collections & Relacionamentos)

> Banco: MongoDB. Toda collection tem `_id: ObjectId`, `tenant_id: ObjectId` (obrigatório, indexado, injetado via plugin — ver `01-arquitetura-sistema.md §3`), `created_at`, `updated_at`, `deleted_at` (soft delete), `created_by`, `updated_by`. Omitidos abaixo por brevidade.
>
> Princípio de modelagem: **referenciar** (ObjectId + populate) entre agregados grandes/independentes (processo ↔ cliente ↔ advogado); **embutir** subdocumentos quando o ciclo de vida é dependente e o array não cresce sem limite (ex.: `partes` de um processo). Coleções de alto volume e append-only (publicações, movimentações, auditoria) ficam sempre em collections próprias, nunca embutidas, e são particionadas por tempo via **sharding/index por `tenant_id + created_at`**.

## 1. Plataforma / Multi-tenant

```jsonc
// tenants
{
  _id, nome_escritorio, cnpj, plano_id: ObjectId,
  status: "trial|ativo|suspenso|cancelado",
  trial_expires_at, storage_used_bytes,
  limites: { usuarios, processos_monitorados, storage_gb, publicacoes_mes },
  db_isolado: { ativo: bool, connection_ref }  // preenchido só no Enterprise
}

// planos
{ _id, nome, preco_mensal, preco_anual, limites: {...}, recursos: { crm: true, bi_avancado: true, ... } }

// assinaturas
{ _id, tenant_id, plano_id, status, ciclo, inicio, fim, gateway, gateway_subscription_id }

// faturas
{ _id, tenant_id, assinatura_id, valor, status, vencimento, pago_em, nota_fiscal_url }

// usuarios
{
  _id, tenant_id, nome, email (unique por tenant), senha_hash, mfa: { secret, ativo },
  perfil: "admin|socio|advogado|financeiro|secretaria|estagiario|cliente",
  oab, cpf, avatar_url, status, ultimo_login,
  permissoes_extra: [ { recurso, acao, permitido } ]  // overrides do RBAC base por perfil
}

// auditoria_logs   (append-only, particionada por mês)
{ _id, tenant_id, usuario_id, acao, entidade, entidade_id, antes, depois, ip, user_agent, criado_em }
```

## 2. Pessoas

```jsonc
// clientes
{
  _id, tenant_id, tipo: "pf|pj", nome, cpf, cnpj, email, telefone, whatsapp,
  endereco: {...}, origem_lead, status: "ativo|inativo|prospect", tags: [String]
}

// advogados
{ _id, tenant_id, usuario_id, oab_numero, oab_uf, especialidades: [String], comissao_pct }

// funcionarios
{ _id, tenant_id, usuario_id, cargo, departamento }

// correspondentes
{ _id, tenant_id, nome, oab_numero, cidades_atendidas: [String], valor_diligencia_padrao }
```

## 3. Processos & Publicações

```jsonc
// processos
{
  _id, tenant_id, numero_cnj,           // unique index { tenant_id, numero_cnj }
  area, classe, assunto, tribunal, vara, comarca, uf, instancia,
  status: "ativo|suspenso|encerrado|arquivado",
  valor_causa, risco: "baixo|medio|alto",
  cliente_id: ObjectId, advogado_responsavel_id: ObjectId, correspondente_id: ObjectId,
  data_distribuicao, data_encerramento, observacoes,
  partes: [ { tipo: "autor|reu|terceiro", nome, documento, polo } ]  // embutido: pequeno e fechado
}

// monitoramentos
{ _id, tenant_id, tipo: "oab|cpf|cnpj|processo", valor, advogado_id, tribunais_alvo: [String], ativo }

// publicacoes   (append-only, alto volume — particionada/sharded por tenant_id + data_publicacao)
{
  _id, tenant_id, monitoramento_id, processo_id,   // processo_id nulo até vincular (fuzzy match)
  fonte: "dje|djen|api_stj|api_stf|api_tse|trt|scraper_<tribunal>",
  tribunal, numero_processo, data_publicacao, tipo_movimentacao,
  inteiro_teor_texto, inteiro_teor_pdf_url,
  prazo_calculado_dias, prazo_data_limite,
  responsavel_id, cliente_id, urgencia: "baixa|media|alta|critica",
  status: "nao_lida|lida|triada|vinculada|arquivada",
  tags: [String],
  hash_dedupe   // unique index { tenant_id, hash_dedupe } evita duplicidade entre fontes
}

// movimentacoes_processo   (append-only)
{ _id, tenant_id, processo_id, publicacao_id, data, descricao, origem }

// prazos
{ _id, tenant_id, processo_id, publicacao_id, tipo, data_inicio, data_fim, dias_uteis,
  responsavel_id, status: "pendente|cumprido|perdido|prorrogado" }
```

### Timeline do processo — read model CQRS

Em vez de uma collection própria de escrita, `processo_timeline` é uma **view materializada por agregação** (job incremental disparado por eventos Kafka) escrita numa collection `processo_timeline_view`:

```jsonc
// processo_timeline_view  (populada por consumers, nunca escrita diretamente pelos módulos de domínio)
{ _id, tenant_id, processo_id, eventos: [
    { tipo: "publicacao|movimentacao|tarefa|audiencia|documento|financeiro",
      data, resumo, referencia_id }
  ] }
```
Isso evita `$lookup` caro entre 6+ collections toda vez que a tela de timeline é aberta.

## 4. Documentos

```jsonc
// documentos
{
  _id, tenant_id, processo_id, cliente_id, nome,
  tipo: "peca|contrato|procuracao|comprovante|outro",
  storage_key, mime, tamanho_bytes, versao, documento_pai_id,
  ocr_status: "pendente|processando|concluido|erro", ocr_texto, hash_sha256
}

// documento_templates
{ _id, tenant_id, nome, categoria, corpo_html, variaveis: [String] }
```

## 5. Agenda

```jsonc
// audiencias
{ _id, tenant_id, processo_id, tipo, data_hora, local,
  modalidade: "presencial|virtual", link_virtual, advogado_id,
  status: "agendada|realizada|cancelada|remarcada" }

// tarefas
{ _id, tenant_id, processo_id, titulo, descricao, responsavel_id,
  data_vencimento, prioridade, status: "pendente|em_andamento|concluida|atrasada" }

// agenda_integracoes
{ _id, tenant_id, usuario_id, provedor: "google|outlook",
  token_criptografado, refresh_token_criptografado, calendario_id_externo, sincronizado_em }
```

## 6. Financeiro

```jsonc
// honorarios
{ _id, tenant_id, processo_id, cliente_id, tipo: "fixo|exito|contratual", valor, parcelas,
  status: "pendente|parcial|pago|atrasado" }

// contas_pagar / contas_receber
{ _id, tenant_id, categoria, descricao, valor, vencimento, pago_em,
  forma_pagamento: "pix|boleto|cartao|transferencia", status, anexo_url }

// custas_processuais
{ _id, tenant_id, processo_id, tipo, valor, data, reembolsavel, reembolsado }

// comissoes
{ _id, tenant_id, advogado_id, honorario_id, percentual, valor_calculado, pago }

// notas_fiscais
{ _id, tenant_id, cliente_id, numero, valor, status, xml_url, pdf_url }
```

## 7. CRM

```jsonc
// leads
{ _id, tenant_id, nome, contato, origem, campanha_id,
  etapa_funil: "novo|qualificado|proposta|negociacao|ganho|perdido",
  valor_estimado, responsavel_id }

// propostas
{ _id, tenant_id, lead_id, cliente_id, valor, escopo, status: "enviada|aceita|recusada", pdf_url }

// campanhas
{ _id, tenant_id, nome, canal, custo, leads_gerados, conversoes }
```

## 8. BI — read models (CQRS)

Agregados pesados nunca são calculados on-the-fly na tela do dashboard. São **materializados por jobs incrementais** (BullMQ, disparado por eventos) usando o `$merge` do agregation framework:

```jsonc
// mv_dashboard_diario
{ tenant_id, data, processos_ativos, processos_novos, processos_encerrados,
  publicacoes_recebidas, prazos_vencendo, audiencias_dia, receita, despesa }

// mv_ranking_advogados
{ tenant_id, advogado_id, periodo, processos_ativos, pecas_produzidas,
  audiencias_realizadas, honorarios_gerados, tempo_medio_processo_dias }

// mv_ranking_clientes
{ tenant_id, cliente_id, periodo, receita_total, processos_ativos }
```

## 9. Relacionamentos (alto nível)

```
tenants 1─N usuarios, clientes, advogados, funcionarios, correspondentes
clientes 1─N processos
advogados 1─N processos (advogado_responsavel_id)
processos 1─N publicacoes (via processo_id, preenchido no matching)
processos 1─N movimentacoes_processo, prazos, audiencias, tarefas, documentos,
             honorarios, custas_processuais
monitoramentos 1─N publicacoes
leads 1─0..1 propostas → conversão gera cliente + processo
```

## 10. Índices essenciais (definidos no schema Mongoose, não deixados para depois)

```
tenants:               { cnpj: 1 } unique
usuarios:               { tenant_id: 1, email: 1 } unique
processos:              { tenant_id: 1, numero_cnj: 1 } unique
                         { tenant_id: 1, cliente_id: 1 }
                         { tenant_id: 1, advogado_responsavel_id: 1, status: 1 }
publicacoes:             { tenant_id: 1, hash_dedupe: 1 } unique
                         { tenant_id: 1, data_publicacao: -1 }
                         { tenant_id: 1, status: 1, urgencia: 1 }
                         { tenant_id: 1, processo_id: 1 }
movimentacoes_processo:  { tenant_id: 1, processo_id: 1, data: -1 }
auditoria_logs:          { tenant_id: 1, criado_em: -1 } (TTL/arquivamento após retenção definida)
```

## 11. Decisões de modelagem

- **Sem transações ACID multi-collection na maioria dos fluxos** — usadas apenas onde o Mongo oferece garantia real (transações multi-documento dentro do replica set: ex. baixa de honorário + geração de recebimento). O restante segue **consistência eventual orquestrada por eventos** (padrão Saga leve), aceitável no domínio (ex.: publicação → vínculo a processo → timeline é naturalmente assíncrono).
- **Soft delete + auditoria** em toda collection sensível (LGPD: anonimização programada em vez de `deleteOne` imediato).
- **Deduplicação de publicações** via `hash_dedupe` com índice único — mesma publicação vinda de DJEN + scraper de tribunal não gera notificação duplicada.
- **Particionamento/sharding**: `publicacoes`, `movimentacoes_processo` e `auditoria_logs` são candidatas a **shard key `{ tenant_id: 1, created_at: 1 }`** quando o cluster crescer além da capacidade de um replica set único (trilha descrita em `01-arquitetura-sistema.md` e no plano de fases).
