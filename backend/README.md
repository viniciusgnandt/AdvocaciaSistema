# JurisFlow Backend — bootstrap inicial (módulo de Publicações/DJEN)

Primeiro corte funcional: puxa publicações reais do **DJEN** (Diário de Justiça
Eletrônico Nacional, API pública do CNJ) por OAB+UF ou por número de processo,
deduplica e persiste no MongoDB. É a base do Módulo 1 descrito em `../docs`.

## Setup

```bash
cd backend
npm install
cp .env.example .env
# ajuste MONGO_URI se não for local
```

Precisa de um MongoDB rodando (local: `mongod` ou `docker run -p 27017:27017 mongo:7`).

## Rodar via script (mais rápido para validar a integração)

```bash
# apenas consulta e imprime (não grava)
npm run seed:publicacoes:dje -- --oab 123456 --uf SP

# consulta e grava no Mongo, deduplicando por hash
npm run seed:publicacoes:dje -- --oab 123456 --uf SP --persist

# por número de processo (formato CNJ)
npm run seed:publicacoes:dje -- --processo 0001234-12.2024.8.26.0100 --persist
```

## Rodar a API completa

```bash
npm run start:dev
# Swagger em http://localhost:3001/docs
```

Endpoints (todos exigem o header `x-tenant-id` — stub temporário até o módulo de
Auth existir; usar qualquer ObjectId de 24 hex chars, ex. `000000000000000000000001`):

```
POST /publicacoes/monitoramentos          { tipo: "oab", valor: "123456", oab_uf: "SP" }
GET  /publicacoes/monitoramentos
POST /publicacoes/monitoramentos/:id/pull?dataInicio=2026-07-01&dataFim=2026-07-28
POST /publicacoes/pull-todos
GET  /publicacoes?status=nao_lida&urgencia=alta
```

Há também um **Cron diário às 05:00** (`publicacoes-scheduler.service.ts`) que roda
`executarTodosAtivos` para todos os tenants — cobre a v1; evolui para worker BullMQ
dedicado conforme volume (ver `../docs/06-arquitetura-filas.md`, a escrever).

## O que falta (próximos passos naturais)

- Módulo de Auth/JWT + resolução real de tenant (remove o header `x-tenant-id`).
- Conectores para STF, STJ, TSE, TRTs e tribunais fora do DJEN.
- Notificação (email/WhatsApp/push/Telegram) disparada por evento `PublicacaoCriada`.
- Vínculo automático publicação → processo (matching por número CNJ).
- Mover ingestão para worker separado (fila) em vez de rodar in-process no Cron.
