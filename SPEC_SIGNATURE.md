# SPEC: Módulo de Assinatura de Documentos PDF com Certificado Digital

## Visão Geral

Criar um módulo para assinatura digital de documentos PDF utilizando certificados digitais (ICP-Brasil) previamente cadastrados no sistema.

---

## Funcionalidades

### 1. Cadastro de Certificados Digitais (Admin)

**Local:** Menu "Certificados" (novo)

**Campos do certificado:**
- Nome/Título (identificação interna)
- Arquivo do certificado (.pfx, .p12)
- Senha do certificado
- Titular (nome do responsável)
- CPF do titular
- Validade (data de expiração)
- Status (ATIVO/EXPIRADO/REVOGADO)

**Validações:**
- Verificar se certificado está válido na data de upload
- Armazenar hash da senha para validação posterior
- Não permitir upload de certificados expirados

### 2. Upload de Documentos para Assinatura

**Campos:**
- Título do documento
- Arquivo PDF (upload)
- Descrição (opcional)

**Validações:**
- Apenas arquivos .pdf
- Tamanho máximo: 10MB
- Verificar se PDF não está corrompido

### 3. Processo de Assinatura

**Fluxo:**
1. Usuário seleciona documento carregado
2. Sistema lista certificados ativos disponíveis
3. Usuário seleciona certificado
4. Sistema valida senha do certificado
5. Sistema assina digitalmente o PDF
6. Gera novo PDF com assinatura
7. Registra log de auditoria

### 4. Armazenamento e Baixa

**Após assinatura:**
- PDF assinado disponível para download
- Documento original marcado como "assinado"
- Histórico de assinaturas (quem, quando, qual certificado)

---

## Implementação Planejada

### Backend

1. **novo model** `DigitalCertificate` no Prisma
2. **novo model** `Document` para documentos
3. **novo service** `signature.service.ts` com funções de assinatura
4. **novas rotas** `/api/v1/certificates` e `/api/v1/documents`
5. **integração** com library de assinatura PDF

### Frontend

1. **Nova página** de Certificados (admin)
2. **Nova página** de Documentos para Assinar
3. **Modal** de seleção de certificado e assinatura
4. **Listas** de documentos pendentes e assinados

---

## Dados de Referência

### Arquivos relevantes a criar
- `prisma/schema.prisma` - novos models
- `src/modules/certificates/certificates.service.ts`
- `src/modules/certificates/certificates.routes.ts`
- `src/modules/documents/documents.service.ts`
- `src/modules/documents/documents.routes.ts`
- `src/modules/signature/signature.service.ts`
- `web/src/App.tsx` - novas páginas
- `web/src/api.ts` - novas APIs
- `web/src/types.ts` - novos tipos