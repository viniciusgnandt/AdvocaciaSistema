# Arquitetura Completa do Sistema

## 1. Visão em camadas

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENTES                                │
│   Web (Next.js/PWA)   Mobile (Expo/RN)   API pública (parceiros) │
└───────────────────────────┬───────────────────────────────────────┘
                             │ HTTPS/JSON, WebSocket (notificações)
┌───────────────────────────▼───────────────────────────────────────┐
│                     EDGE / API GATEWAY                             │
│  OCI WAF + CDN │ Kong/NGINX Gateway │ Rate limiting │ Auth JWT     │
└───────────────────────────┬───────────────────────────────────────┘
                             │
┌───────────────────────────▼───────────────────────────────────────┐
│                   BACKEND — NestJS Modular Monolith                │
│  (extraível para microsserviços por bounded context conforme carga)│
│                                                                      │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌────────────────────┐ │
│  │   Auth &   │ │ Processos │ │  Pessoas  │ │     Documentos      │ │
│  │   IAM      │ │           │ │(Clientes/ │ │  (upload/OCR/busca) │ │
│  │            │ │           │ │Advogados) │ │                      │ │
│  └───────────┘ └───────────┘ └───────────┘ └────────────────────┘ │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌────────────────────┐ │
│  │  Agenda   │ │Financeiro │ │   CRM     │ │   BI / Dashboard    │ │
│  └───────────┘ └───────────┘ └───────────┘ └────────────────────┘ │
│  ┌───────────┐ ┌───────────┐ ┌────────────────────────────────┐  │
│  │ Publicações│ │Notificações│ │  Admin/Billing/Multi-tenant   │  │
│  │  (leitura) │ │            │ │                                │  │
│  └───────────┘ └───────────┘ └────────────────────────────────┘  │
└───────────────────────────┬───────────────────────────────────────┘
                             │ eventos (Kafka) / jobs (BullMQ+Redis)
┌───────────────────────────▼───────────────────────────────────────┐
│                 SERVIÇO DE INGESTÃO DE PUBLICAÇÕES                 │
│  (worker pool independente, escala horizontal própria)             │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌─────────────────┐│
│  │ Conectores  │ │ Conectores │ │  Robôs de   │ │  Parser/Matcher ││
│  │ API oficiais│ │ DJEN/CNJ   │ │  scraping   │ │  (NLP + regex)  ││
│  │ (STF/STJ/   │ │ (Comunica) │ │  (tribunais │ │                  ││
│  │  TSE/TRT)   │ │            │ │  sem API)   │ │                  ││
│  └────────────┘ └────────────┘ └────────────┘ └─────────────────┘│
└───────────────────────────┬───────────────────────────────────────┘
                             │
┌───────────────────────────▼───────────────────────────────────────┐
│                          DADOS & MENSAGERIA                        │
│  MongoDB Replica Set (multi-tenant por tenant_id) │ OpenSearch     │
│  (full-text/OCR) │ Redis (cache/filas/rate-limit) │ Kafka (events) │
│  OCI Object Storage (arquivos/PDF/backups)                         │
└─────────────────────────────────────────────────────────────────┘
```

## 2. Por que modular monolith em vez de microsserviços "puros" desde o início

- Reduz custo operacional inicial (1 pipeline de deploy, 1 banco lógico com RLS) sem abrir mão de fronteiras de domínio limpas.
- Cada módulo Nest é um "bounded context" com sua própria pasta `domain/application/infrastructure` (Clean Architecture) — a extração futura para serviço próprio é uma questão de mover a pasta e trocar chamadas in-process por chamadas HTTP/eventos, pois a comunicação entre módulos já ocorre via **interfaces de aplicação** e **eventos de domínio**, nunca por acesso direto a repositório de outro módulo.
- O **Serviço de Ingestão de Publicações** já nasce separado (processo/deploy próprio) porque tem perfil de carga, escala e SLA totalmente diferentes do resto (picos noturnos de scraping, retries, rate limits de tribunais).

## 3. Multi-tenancy (MongoDB)

Sem RLS nativo como no Postgres, o isolamento vira responsabilidade de **disciplina de aplicação + camadas de defesa em profundidade**:

- **Estratégia padrão (planos Starter/Professional/Business)**: banco único compartilhado, `tenant_id: ObjectId` presente em **todo** documento de **toda** coleção, sempre como primeiro campo do índice composto (`{ tenant_id: 1, ... }`). Nenhuma query pode ser executada sem `tenant_id` — garantido por:
  - **Mongoose middleware/plugin global** (`tenantPlugin`) aplicado a todos os schemas: injeta `tenant_id` automaticamente em `save`, e em `find/findOne/updateMany/deleteMany/aggregate` via `pre` hooks que exigem o filtro (lança erro em dev/CI se uma query for construída sem tenant no contexto).
  - **AsyncLocalStorage (Nest `ContextService`)** guarda o `tenant_id` resolvido do JWT por request; o plugin do Mongoose lê desse contexto — impossível "esquecer" de passar o tenant manualmente em cada chamada de repositório.
  - **Índice único composto** em identificadores de negócio, ex.: `{ tenant_id: 1, numero_cnj: 1 }` unique — impede colisão E reforça que toda busca por esses campos passa pelo tenant.
- **Plano Enterprise**: isolamento físico via **banco Mongo dedicado por tenant** (mesmo cluster/replica set, `db` distinto) ou cluster dedicado nos maiores contratos — a aplicação seleciona a connection string do tenant a partir de um registro central (`tenant_registry`) resolvido no login; o restante do código não muda porque a camada de repositório é agnóstica de "onde" o tenant mora.
- **Auditoria cruzada**: testes automatizados (integração) que tentam acessar dados de tenant A autenticado como tenant B fazem parte do pipeline obrigatório de CI (ver `11-estrategia-testes.md`) — é o principal risco de uma estratégia sem RLS, então é tratado como gate de release, não como boa prática opcional.
- Buckets de Object Storage particionados por prefixo `tenant/{tenant_id}/...` com política IAM que impede cross-tenant.
- Índices do OpenSearch particionados por `tenant_id` como filtro obrigatório (ou índice por tenant nos maiores clientes).

### Por que não Postgres+RLS
RLS dá isolamento no nível do banco (defesa mesmo se a aplicação tiver bug). Em Mongo abrimos mão dessa rede de segurança em troca de: schema flexível para os dados heterogêneos de publicações/movimentações (payloads variam muito por tribunal/fonte), escrita mais barata em alto volume de ingestão (milhões de publicações), e agregações (`$group`, `$facet`) nativas para boa parte do BI. O trade-off é compensado com o plugin de tenant obrigatório + testes de isolamento no CI + opção de banco dedicado no Enterprise.

## 4. Componentes de infraestrutura (OCI)

| Componente | Serviço OCI |
|---|---|
| Orquestração de containers | OKE (Kubernetes) |
| Banco relacional | OCI Base Database (PostgreSQL) ou Autonomous DB |
| Object Storage | OCI Object Storage |
| Cache/filas | Redis (OCI Cache ou self-managed no OKE) |
| Event bus | Kafka (OCI Streaming, compatível Kafka API, ou self-managed) |
| Secrets | OCI Vault |
| CDN/WAF | OCI CDN + WAF |
| Load Balancer | OCI Flexible Load Balancer |
| DNS | OCI DNS |
| CI/CD | GitHub Actions → OCI Container Registry → OKE |
| Observabilidade | Grafana Cloud ou self-hosted (Prometheus/Loki/Tempo) |

## 5. Fluxo de requisição típico

1. Cliente → CDN/WAF → API Gateway (valida JWT, rate limit por tenant/plano).
2. Gateway roteia para o serviço Nest (monolito modular) certo via path (`/api/v1/processos/...`).
3. Controller → Application Service (caso de uso) → Domain → Repository (Prisma) com `tenant_id` já setado na transação.
4. Eventos de domínio relevantes (ex.: `ProcessoCriado`, `PublicacaoRecebida`) publicados no Kafka para consumidores assíncronos (notificação, BI, auditoria).
5. Resposta serializada via DTO (nunca a entidade de domínio diretamente).

Continua em `02-modelagem-banco-erd.md`, `03-microservices.md`, `04-fluxo-autenticacao.md`, `05-fluxo-monitoramento-publicacoes.md`, `06-arquitetura-filas.md`.
