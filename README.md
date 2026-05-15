# Gestconv360 - Modulo Instrumentos/Propostas

Reestruturado para Node.js + TypeScript + Express + Prisma + SQLite.

## O que esta pronto

- CRUD de Instrumentos/Propostas
- Autenticacao JWT
- Perfis de acesso (ADMIN, GESTOR, CONSULTA)
- Validacoes principais de negocio
- Exclusao logica (campo `ativo`)
- Filtros por status, concedente e vigencia
- Endpoint de alertas de prazo (vigencia e prestacao de contas)
- Cadastro de convenetes (prefeituras)

## Stack

- API: Express com TypeScript
- ORM: Prisma
- Banco: SQLite (facil para inicio)
- Validacao: Zod

## Campos modelados

- `proposta`
- `instrumento`
- `objeto`
- `valor_repasse`
- `valor_contrapartida`
- `data_cadastro`
- `data_assinatura`
- `vigencia_inicio`
- `vigencia_fim`
- `data_prestacao_contas`
- `data_dou`
- `concedente`
- `status`
- `responsavel`
- `orgao_executor`
- `observacoes`

## Regras implementadas

- `proposta` unica
- `instrumento` unico
- `valor_repasse` e `valor_contrapartida` >= 0
- `vigencia_fim` >= `vigencia_inicio`
- `data_assinatura` nao pode ser futura

## Como executar

```bash
copy .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

## Deploy no Railway (sem Docker)

Este projeto esta configurado para deploy via Nixpacks/Node (sem Dockerfile).

- Build Command: `npm ci && npm run build`
- Start Command: `npm start`
- Healthcheck: `/health`

Variaveis minimas:

- `DATABASE_URL`
- `DIRECT_URL` (quando aplicavel na infraestrutura do banco)
- `CORS_ALLOWED_ORIGINS` (ex.: `https://frontend-production-fc41.up.railway.app`)

## Backup e restauracao (MVP)

Comandos disponiveis:

```bash
npm run backup:hourly
npm run backup:daily
npm run backup:monthly
npm run backup:purge-docs
```

Variaveis de ambiente para backup:

- `BACKUP_R2_BUCKET`
- `BACKUP_PREFIX`
- `BACKUP_TIMEZONE`
- `BACKUP_RETENTION_HOURLY_HOURS`
- `BACKUP_RETENTION_DAILY_DAYS`
- `BACKUP_RETENTION_MONTHLY_MONTHS`
- `BACKUP_PG_DUMP_PATH`
- `BACKUP_PG_RESTORE_PATH`
- `DOCUMENTOS_HARD_DELETE_DELAY_DAYS`

Runbook operacional:

- `docs/runbook-restauracao-backup-gestconv360.md`

## Frontend (web)

Foi adicionado um frontend React + Vite em `web/` para login/cadastro e consulta de instrumentos.

```bash
npm --prefix web install
npm run web:dev
```

- URL frontend: `http://localhost:5173`
- O Vite faz proxy para a API em `http://localhost:3000`

## Qualidade e regressao

Para validar backend, frontend e a regressao critica de tickets em um comando:

```bash
npm run check:quality
```

Para rodar apenas a regressao de tickets:

```bash
npm run test:tickets-regression
```

Tambem foi adicionado workflow de CI em `.github/workflows/quality-check.yml` para executar essas verificacoes em push/PR.

## Tickets por Gmail (polling)

O sistema suporta abertura automatica de tickets por email via Gmail API (1 ticket por mensagem).

- Configure as variaveis `GMAIL_*` no `.env`.
- Ative com `GMAIL_TICKET_INGESTION_ENABLED="true"`.
- A ingestao roda por polling no backend (`GMAIL_TICKET_POLL_INTERVAL_MS`).
- Remetentes fora de `GMAIL_TICKET_ALLOWED_DOMAINS` sao ignorados e registrados em log de ingestao.

Endpoints administrativos (somente ADMIN):

- `GET /api/v1/tickets-email/status`
- `POST /api/v1/tickets-email/sync`

## URL principal

- API: `http://localhost:3000`
- Healthcheck: `http://localhost:3000/health`

## Endpoints de autenticacao

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`

### Exemplo de register

```json
{
  "nome": "Administrador",
  "email": "admin@gestconv360.local",
  "senha": "123456",
  "role": "ADMIN"
}
```

### Exemplo de login

```json
{
  "email": "admin@gestconv360.local",
  "senha": "123456"
}
```

Use o token retornado no header `Authorization: Bearer <token>`.

## Permissoes

- `ADMIN`: CRUD completo de instrumentos e gestao geral
- `GESTOR`: cria, lista, consulta e atualiza instrumentos
- `CONSULTA`: apenas listagem, consulta por id e alertas

## Endpoints do modulo

- `POST /api/v1/instrumentos`
- `GET /api/v1/instrumentos`
- `GET /api/v1/instrumentos/:id`
- `PUT /api/v1/instrumentos/:id`
- `DELETE /api/v1/instrumentos/:id`
- `GET /api/v1/instrumentos/alerts/deadlines?limite_dias=30`

## Endpoints de convenetes

- `GET /api/v1/convenetes`
- `POST /api/v1/convenetes`
- `PUT /api/v1/convenetes/:id`
- `DELETE /api/v1/convenetes/:id`

## Exemplo de payload (create)

```json
{
  "proposta": "123456/2026",
  "instrumento": "987654/2026",
  "objeto": "Reforma da unidade basica de saude do bairro Centro",
  "valor_repasse": 1500000,
  "valor_contrapartida": 250000,
  "data_cadastro": "2026-03-23",
  "data_assinatura": "2026-03-20",
  "vigencia_inicio": "2026-04-01",
  "vigencia_fim": "2027-12-31",
  "data_prestacao_contas": "2028-02-15",
  "data_dou": "2026-03-25",
  "concedente": "Ministerio da Saude",
  "status": "EM_EXECUCAO",
  "responsavel": "Maria Souza",
  "orgao_executor": "Secretaria Municipal de Saude",
  "observacoes": "Aguardando plano de trabalho final"
}
```

## Proximos passos naturais

- historico/auditoria por campo alterado
- upload de documentos (DOU, termo, anexos)
- dashboard com indicadores e exportacao CSV/Excel

## Migracao recomendada: PostgreSQL + pgvector

Para habilitar RAG hibrido (full text + semantico) no Assistente 360 em producao, a recomendacao e migrar a base para PostgreSQL com extensao `pgvector`.

Passos iniciais sugeridos:

1. Provisionar PostgreSQL 16+ e habilitar `pgvector`.
2. Atualizar `DATABASE_URL` para Postgres (exemplo: `postgresql://usuario:senha@localhost:5432/gestconv360`).
3. Executar `npx prisma migrate deploy` no ambiente alvo.
4. Rodar rotina de indexacao de chunks/embeddings dos documentos.
5. Ativar consultas hibridas no Assistente (busca lexical + vetor + reranking).

### Setup rapido local (pgvector)

1. Subir Postgres com pgvector:

```bash
docker compose -f docker-compose.pgvector.yml up -d
```

2. Configurar `.env`:

```env
ASSISTENTE_PGVECTOR_ENABLED="true"
ASSISTENTE_PGVECTOR_DATABASE_URL="postgresql://postgres:postgres@localhost:5433/gestconv360_ai"
ASSISTENTE_PGVECTOR_TOP_K="8"
```

3. Inicializar schema vetorial:

```bash
npm run pgvector:bootstrap
```

4. Sincronizar chunks da base principal para `knowledge_chunks`:

```bash
npm run assistente:sync-pgvector
```

Observacao: nesta fase inicial do repositorio, a modelagem de sessao/mensagem/contexto do Assistente 360 ja foi adicionada para suportar continuidade conversacional e logs de busca.
