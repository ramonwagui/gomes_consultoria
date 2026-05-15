# Descricao do sistema GestConv360

Data de referencia: 14/05/2026

## 1. Visao geral

O GestConv360 e uma plataforma de gestao de convenios, instrumentos de repasse, propostas, documentos, tickets e acompanhamento financeiro voltada para equipes que atendem municipios, prefeituras e demais proponentes. O sistema centraliza informacoes operacionais, documentais e financeiras de instrumentos publicos, permitindo acompanhar desde a proposta e celebracao ate a execucao, prestacao de contas, pagamentos, relatorios e consultas a bases governamentais.

A aplicacao combina uma API backend, um painel web administrativo e um aplicativo mobile. O backend concentra as regras de negocio, autenticacao, integracoes externas, rotinas de sincronizacao e persistencia dos dados. O frontend web entrega a operacao completa do sistema, com dashboards, cadastros, relatorios, assistente, tickets, documentos e fluxos de acompanhamento. O app mobile oferece acesso complementar para consulta de instrumentos, relatorios, perfil e detalhes de obra.

## 2. Objetivos do sistema

- Organizar instrumentos, propostas e convenios em um unico ambiente.
- Controlar proponentes, usuarios, permissoes e areas de responsabilidade.
- Acompanhar prazos, vigencias, repasses, execucao fisica e execucao financeira.
- Gerenciar documentos internos e documentos enviados por links externos.
- Automatizar parte do atendimento por tickets, inclusive via e-mail.
- Consultar e consolidar informacoes de fontes publicas como Transferegov, Portal da Transparencia, FNS, SIMEC e SISMOB.
- Gerar relatorios e documentos formais a partir de templates.
- Disponibilizar um assistente com historico de conversa e busca em dados/documentos do sistema.

## 3. Arquitetura

O projeto esta organizado como um monorepo com tres frentes principais:

- Backend em `src/`: API REST em Node.js, TypeScript e Express.
- Frontend web em `web/`: aplicacao React com Vite.
- Mobile em `mobile/`: aplicacao Expo/React Native com Expo Router.

A camada de persistencia usa Prisma ORM com banco PostgreSQL, conforme o `schema.prisma` atual. O sistema tambem possui suporte auxiliar a PostgreSQL com pgvector para busca semantica do Assistente 360, quando habilitado.

Arquivos, anexos, logos, timbres, documentos enviados e documentos gerados podem ser armazenados localmente ou em Cloudflare R2, dependendo da configuracao do ambiente. O backend tambem possui rotinas de jobs em segundo plano para sincronizacoes, polling de e-mail e notificacoes, controladas por variaveis de ambiente.

## 4. Tecnologias utilizadas

### Backend

- Node.js com TypeScript.
- Express para API HTTP.
- Prisma ORM para modelagem e acesso ao banco.
- PostgreSQL como banco principal.
- Zod para validacoes de entrada.
- JWT e cookies de sessao para autenticacao.
- bcryptjs para hash de senhas.
- Helmet, CORS, Morgan e cookie-parser para seguranca, CORS, logs e cookies.
- Multer para upload de arquivos.
- AWS SDK S3 para armazenamento compativel com Cloudflare R2.
- Google APIs para integracao com Gmail.
- OpenAI SDK para recursos de IA.
- pg e pgvector para suporte a busca vetorial do assistente.
- Playwright, Cheerio e clientes HTTP/scrapers para consultas automatizadas a portais publicos.
- docx, docxtemplater, PizZip, pdf-lib, mammoth, pdf-parse, fflate e xlsx para documentos, PDFs, DOCX, leitura de conteudo e planilhas.

### Frontend web

- React.
- TypeScript.
- Vite.
- CSS proprio em `web/src/styles.css`.
- Consumo da API por `fetch`, com tratamento de sessao, refresh e CSRF.
- Build separado em `web/`, com proxy local para o backend durante desenvolvimento.

### Mobile

- Expo.
- React Native.
- Expo Router.
- React Navigation.
- Expo Secure Store para armazenamento seguro.
- Expo Print e Expo Sharing para recursos de documento/compartilhamento.
- Suporte a Android, iOS e web via Expo.

### Infraestrutura e deploy

- Railway como alvo de deploy previsto no projeto.
- Dockerfile e configuracoes auxiliares.
- Banco PostgreSQL externo, com indicacao de uso de Neon no estudo de custos.
- Cloudflare R2 para armazenamento de arquivos quando `R2_ENABLED=true`.
- Gmail/Google Workspace para abertura automatica de tickets por e-mail.
- OCR.Space como recurso opcional para OCR de documentos.
- GitHub Actions para verificacoes de qualidade.

## 5. Principais funcionalidades

### Autenticacao, usuarios e permissoes

O sistema possui autenticacao com login, refresh de sessao, cookies seguros e suporte legado a Bearer token. Os perfis modelados sao `ADMIN`, `GESTOR`, `CONSULTA`, `FINANCEIRO` e `DEMONSTRACAO`.

Funcionalidades relacionadas:

- Cadastro, edicao e consulta de usuarios.
- Perfil do usuario com avatar.
- Controle de permissoes por proponente/convenente.
- Ambiente de demonstracao com dados isolados por usuario demo.
- Protecao de rotas por papel e autenticacao.

### Proponentes/convenentes

O modulo de proponentes organiza dados cadastrais de municipios, prefeituras e entidades atendidas. A API mantem tambem o alias antigo `convenetes`, marcado como rota depreciada, apontando para `proponentes`.

Funcionalidades:

- Cadastro e edicao de proponentes.
- Dados de endereco, CNPJ, contato e gestor.
- Upload/remocao de logo e timbre.
- Consulta de CNPJ para preenchimento cadastral.
- Associacao entre proponentes, usuarios, instrumentos e solicitacoes de pagamento.

### Instrumentos, propostas e fluxo de execucao

O modulo de instrumentos e o nucleo operacional do GestConv360. Ele registra propostas, instrumentos, objeto, valores, vigencia, concedente, status, responsaveis, orgao executor, dados bancarios, repasses, medicao e acompanhamento.

Funcionalidades:

- CRUD de instrumentos/propostas.
- Exclusao logica por campo `ativo`.
- Filtros por status, concedente, vigencia, proponente e outros criterios.
- Controle de status: em elaboracao, assinado, em execucao, vencido, prestacao pendente e concluido.
- Tipos de fluxo: obra, aquisicao de equipamentos e eventos.
- Alertas de prazos e vencimentos.
- Historico de auditoria de criacao, alteracao e desativacao.
- Repasses do instrumento.
- Progresso fisico da obra.
- Boletins de medicao.
- Follow-ups por etapa, com texto e anexos.

### Checklist documental e links externos

Cada instrumento pode possuir checklist por etapa, com documentos obrigatorios ou opcionais, status, ordem, observacoes e arquivos.

Funcionalidades:

- Criacao, edicao, conclusao e remocao de itens de checklist.
- Upload, download e remocao de arquivos por item.
- Status de item: nao iniciado, em elaboracao, concluido e aceito.
- Links publicos temporarios para recebimento externo de documentos.
- Registro de arquivos enviados por terceiros.
- Controle de expiracao e desativacao de links.

### Area de documentos

A area de documentos centraliza arquivos vinculados a instrumentos e proponentes, com auditoria e suporte a busca.

Funcionalidades:

- Upload interno de documentos.
- Recebimento externo por solicitacoes publicas com token.
- Registro de origem, remetente, CPF, e-mail, IP e submissao.
- Renomeacao, exclusao logica e download.
- Logs de auditoria para upload, download, exclusao, renomeacao, alteracao e envio externo.
- Indexacao de texto extraido para busca.
- Suporte opcional a IA, OCR, resumo, classificacao e busca semantica.

### Geracao de documentos

O sistema possui modulo para gerar documentos a partir de templates DOCX e dados cadastrados.

Funcionalidades:

- Cadastro de templates com codigo, nome, tipo, descricao e arquivo DOCX.
- Versionamento de templates.
- Cadastro de responsaveis tecnicos.
- Substituicao automatica de placeholders.
- Geracao de documentos vinculados a instrumentos.
- Exportacao/download em DOCX e PDF.
- Log dos documentos gerados.

### Pagamentos e financeiro

O modulo financeiro permite controlar solicitacoes de pagamento associadas a instrumento e proponente.

Funcionalidades:

- Criacao de solicitacao de pagamento.
- Vinculo com instrumento, proponente e usuario solicitante.
- Registro de valor de nota, valor de boletim de medicao e numero do BM.
- Upload de nota fiscal e empenho.
- Calculo/registro de impostos como INSS, ISS, PIS, COFINS e IR.
- Status: solicitado, em analise, aprovado, rejeitado e pago.
- Download de arquivos financeiros.

### Tickets e atendimento

O sistema inclui gestao de tickets para acompanhar demandas, pendencias e solicitacoes operacionais.

Funcionalidades:

- Criacao manual de tickets.
- Tickets vinculados ou nao a instrumentos.
- Status: aberto, em andamento, resolvido e cancelado.
- Prioridades: baixa, media, alta e critica.
- Responsavel pelo ticket.
- Comentarios e checklist interno do ticket.
- Associacao e desassociacao de instrumentos.
- Controle de prazos e tickets atrasados.
- Relatorios e filtros por status, prioridade, origem, responsavel e busca textual.

### Tickets por Gmail

O backend pode abrir tickets automaticamente por e-mail usando Gmail API, quando habilitado.

Funcionalidades:

- Polling de mensagens da caixa configurada.
- Controle por dominios permitidos.
- Registro de mensagens processadas, ignoradas ou com erro.
- Criacao de 1 ticket por mensagem aceita.
- Uso opcional de IA para resumo, identificacao de instrumento e tratamento do remetente.
- Endpoints administrativos para status e sincronizacao manual.

### Solicitacoes Caixa

O sistema possui modulo para registrar solicitacoes relacionadas a instrumentos, especialmente eventos vindos de e-mails, comentarios de tickets ou associacoes manuais.

Funcionalidades:

- Listagem de solicitacoes por instrumento.
- Busca de instrumentos para associacao.
- Vinculo entre solicitacao, ticket e instrumento.
- Registro de origem, assunto de e-mail e descricao.

### Auditoria

O sistema registra eventos importantes para rastreabilidade.

Funcionalidades:

- Auditoria de instrumentos.
- Auditoria de documentos.
- Registro de usuario, e-mail, acao, dados anteriores e posteriores.
- Consulta por filtros e datas.

### Assistente 360

O Assistente 360 fornece uma interface conversacional para perguntas sobre dados do sistema, instrumentos, documentos e contexto historico.

Funcionalidades:

- Perguntas e respostas via API.
- Historico de sessoes por usuario.
- Mensagens persistidas por sessao.
- Contexto ativo de entidade, municipio e topico.
- Logs de buscas realizadas.
- Suporte opcional a OpenAI.
- Suporte opcional a pgvector para busca hibrida/semantica em documentos e dados indexados.

### Relatorios e dashboards

O painel web possui dashboard e relatorios para acompanhamento gerencial e operacional.

Funcionalidades:

- Indicadores de instrumentos.
- Relatorios de repasses.
- Relatorios de obras.
- Relatorio de andamento de instrumentos.
- Relatorios de tickets.
- Relatorios do Portal da Transparencia.
- Relatorios de transferencias especiais e discricionarias.
- Relatorios FNS.
- Consultas de propostas FNS.
- Relatorios SIMEC obras e termos.
- Extracao SIMEC.
- Consulta SISMOB.

### Emendas estaduais

O modulo de emendas estaduais controla emendas, municipios relacionados e documentos.

Funcionalidades:

- Cadastro e edicao de emendas.
- Vinculo com municipios.
- Dados de objeto, numero, parlamentar, vigencia, valor e contrapartida.
- Upload, atualizacao, download e exclusao de documentos.
- Auditoria de documentos de emendas.

### Integracoes com bases governamentais

O sistema consulta, importa ou sincroniza informacoes de diferentes fontes publicas.

Integracoes identificadas:

- Transferegov Transferencias Especiais.
- Transferencias Discricionarias via repositorio de dados governamentais.
- Portal da Transparencia.
- FNS Repasses / InvestSUS Cidadao.
- Consulta FNS de propostas.
- SIMEC Obras.
- SIMEC Termos.
- SISMOB Cidadao.
- Consulta de CNPJ.

Essas integracoes possuem configuracoes de timeout, cache, agendas de sincronizacao e notificacoes conforme o modulo.

## 6. Telas e experiencia web

O painel web organiza a operacao em secoes como:

- Dashboard.
- Instrumentos.
- Proponentes.
- Emendas estaduais.
- Documentos.
- Geracao de documentos.
- Pagamentos.
- Usuarios.
- Auditoria.
- Tickets.
- Assistente.
- Relatorios.
- Relatorios personalizados.
- Saude tecnica.

A aplicacao web tambem trata expiracao de sessao, refresh automatico, CSRF em operacoes de escrita, uploads por formulario e downloads de arquivos.

## 7. Aplicativo mobile

O app mobile em Expo complementa o uso do sistema com telas de login, abas principais, instrumentos, relatorios, perfil e detalhes de instrumento/obra. A estrutura usa Expo Router e React Navigation, com suporte a armazenamento seguro e componentes nativos do ecossistema Expo.

## 8. Qualidade e operacao

O projeto possui comandos de build, migracao Prisma, desenvolvimento local, checagem de qualidade, regressao de tickets e verificacao do assistente.

Comandos relevantes:

```bash
npm run dev
npm run build
npm run web:dev
npm run web:build
npm run check:quality
npm run test:tickets-regression
npm run assistente:acceptance
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
```

Tambem existem scripts para sincronizacoes, testes de integracoes, bootstrap pgvector, geracao de token Gmail, importacoes e verificacoes especificas de modulos.

## 9. Diferenciais do GestConv360

- Centralizacao de dados tecnicos, financeiros, documentais e de atendimento.
- Organizacao por proponente, instrumento, etapa e usuario.
- Fluxos documentais com upload interno e recebimento externo controlado por token.
- Integracao com bases publicas relevantes para convenios e repasses.
- Automacao de tickets por e-mail com suporte de IA.
- Assistente conversacional com historico e possibilidade de busca semantica.
- Geracao automatizada de documentos a partir de templates.
- Visao web completa e base mobile para consulta em campo.
