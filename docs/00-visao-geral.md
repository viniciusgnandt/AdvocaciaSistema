# JurisFlow — Visão Geral do Produto

> Nome de trabalho: **JurisFlow** (placeholder — trocar antes do registro de marca/domínio).

## 1. Posicionamento

SaaS multi-tenant para escritórios de advocacia brasileiros que unifica:

1. **Monitoramento automático de processos e publicações judiciais** (concorre com JusBrasil Empresas, Escavador).
2. **Gestão completa do escritório com BI** (concorre com Legal One, ProJuris, Astrea, ADVBOX).

Diferencial: UX no nível de Linear/Notion/Stripe/Supabase — rápido, teclado-first, bonito, dark mode nativo — em um mercado cuja UX atual é, em geral, datada.

## 2. Princípios de arquitetura

- **Multi-tenant desde o dia zero**, isolamento lógico forte (RLS no Postgres) com trilha para isolamento físico (schema-per-tenant) em planos Enterprise.
- **Domain-Driven Design** com bounded contexts claros (ver `03-microservices.md`), começando como **modular monolith** e extraindo serviços conforme a carga justificar (evita complexidade prematura de microsserviços "big bang").
- **CQRS** nos contextos de alto volume de leitura/BI (Publicações, Dashboard) — escrita via comandos transacionais, leitura via read models desnormalizados/materializados.
- **Event-driven** entre contextos via broker de mensageria (Kafka ou RabbitMQ — decisão em `06-arquitetura-filas.md`) para desacoplar ingestão de publicações do restante do sistema.
- **API-first**: todo o frontend consome a mesma API REST pública documentada em Swagger; nenhuma rota "interna" escondida.
- **Cloud-native na OCI**: containers em OKE (Kubernetes gerenciado), Object Storage para arquivos, Autonomous DB ou OCI PostgreSQL, OCI Vault para segredos.

## 3. Stack tecnológica (decidida)

### Frontend Web
- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS + shadcn/ui + Radix primitives
- TanStack Query (cache/data fetching) + Zustand (estado local leve)
- React Hook Form + Zod (formulários e validação compartilhada com backend)
- Recharts / visx para gráficos do BI
- next-themes para dark/light

### Mobile
- React Native (Expo) — reaproveita camada de design tokens e client de API TypeScript do monorepo
- PWA como fallback imediato (Next.js já entrega isso quase de graça) enquanto apps nativos amadurecem

### Backend
- NestJS + TypeScript (modular monolith → microsserviços extraíveis)
- **MongoDB 7 (Replica Set, com trilha para Sharded Cluster)** — dados transacionais, multi-tenant via `tenant_id` em todo documento + índice composto obrigatório
- Elasticsearch/OpenSearch (busca full-text, inteiro teor, OCR indexado, pesquisa inteligente) — mantido mesmo com Mongo porque o `$text`/Atlas Search do Mongo não cobre bem OCR + ranking jurídico avançado
- Redis (cache, filas leves, rate limiting, sessões de BFF)
- Kafka (event backbone entre contextos e ingestão de publicações em alto volume) — RabbitMQ como alternativa mais simples se o volume inicial não justificar Kafka (ver ADR em `06`)
- BullMQ (jobs assíncronos sobre Redis: notificações, geração de PDF/Excel, robôs de scraping agendados) coexistindo com Kafka para os fluxos de maior throughput
- Mongoose (ODM: schemas, validação, middlewares de tenant, transações multi-documento quando necessário)
- Passport + JWT (access curto + refresh rotativo) + MFA (TOTP)

### Armazenamento
- OCI Object Storage (buckets por tenant/prefixo) para PDFs, anexos, inteiro teor, backups
- Pré-processamento de OCR via serviço dedicado (Tesseract self-hosted inicialmente; avaliar OCI Document Understanding/AWS Textract equivalente depois)

### Infra / Observabilidade
- Kubernetes (OCI OKE), Terraform (IaC), GitHub Actions (CI/CD)
- OpenTelemetry → Grafana + Loki (logs) + Tempo (tracing) + Prometheus (métricas)
- Sentry (error tracking)

## 4. Módulos do produto

| Módulo | Descrição |
|---|---|
| M1 — Publicações | Cadastro de monitoramento (OAB/CPF/CNPJ/processo), ingestão multi-fonte, parsing, notificação multicanal, filtros |
| M2 — Processos | CRUD de processos, timeline unificada (publicações + movimentações + tarefas + audiências) |
| M3 — Pessoas | Clientes (PF/PJ), advogados, funcionários, correspondentes |
| M4 — Documentos | Upload, versionamento, OCR, busca full-text, templates de peças |
| M5 — Agenda | Audiências, prazos, tarefas, sincronização Google/Outlook |
| M6 — Financeiro | Honorários, custas, contas a pagar/receber, boletos, PIX, notas fiscais, comissões |
| M7 — CRM | Funil de leads, propostas, conversão, origem de cliente, campanhas |
| M8 — BI/Dashboard | KPIs executivos, gráficos, rankings, exportação |
| M9 — Admin/Billing | Planos, assinaturas, cobrança, uso/limites por tenant, gestão de tenants |
| M10 — Plataforma | Auth, RBAC, auditoria, notificações, integrações, API pública |

Detalhes de cada módulo nos documentos seguintes.
