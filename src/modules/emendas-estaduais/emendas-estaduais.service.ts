import { Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import {
  CreateEmendaEstadualInput,
  ListEmendasEstaduaisQueryInput,
  UpdateEmendaEstadualInput
} from "./emendas-estaduais.schema";

let storageReady = false;

const ensureEmendasEstaduaisStorage = async () => {
  if (storageReady) {
    return;
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS emendas_estaduais (
      id BIGSERIAL PRIMARY KEY,
      objeto TEXT NOT NULL,
      numero TEXT NOT NULL,
      parlamentar TEXT NOT NULL,
      vigencia_inicio DATE NOT NULL,
      vigencia_fim DATE NOT NULL,
      valor NUMERIC(14,2) NOT NULL DEFAULT 0,
      contrapartida NUMERIC(14,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS emendas_estaduais_municipios (
      emenda_id BIGINT NOT NULL REFERENCES emendas_estaduais(id) ON DELETE CASCADE,
      convenete_id INTEGER NOT NULL REFERENCES "Convenete"(id) ON DELETE CASCADE,
      PRIMARY KEY (emenda_id, convenete_id)
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS emendas_estaduais_numero_idx
      ON emendas_estaduais (numero);
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS emendas_estaduais_municipios_convenete_idx
      ON emendas_estaduais_municipios (convenete_id);
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS emendas_estaduais_documentos (
      id BIGSERIAL PRIMARY KEY,
      emenda_id BIGINT NOT NULL REFERENCES emendas_estaduais(id) ON DELETE CASCADE,
      arquivo_nome_original TEXT NOT NULL,
      arquivo_path TEXT NOT NULL,
      mime_type TEXT,
      tamanho BIGINT,
      versao INTEGER NOT NULL DEFAULT 1,
      created_by_user_id INTEGER,
      created_by_email TEXT NOT NULL,
      updated_by_user_id INTEGER,
      updated_by_email TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS emendas_estaduais_documentos_auditoria (
      id BIGSERIAL PRIMARY KEY,
      emenda_id BIGINT NOT NULL REFERENCES emendas_estaduais(id) ON DELETE CASCADE,
      documento_id BIGINT REFERENCES emendas_estaduais_documentos(id) ON DELETE SET NULL,
      acao TEXT NOT NULL,
      detalhes JSONB,
      user_id INTEGER,
      user_email TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  storageReady = true;
};

type EmendaBaseRow = {
  id: bigint | number;
  objeto: string;
  numero: string;
  parlamentar: string;
  vigencia_inicio: Date | string;
  vigencia_fim: Date | string;
  valor: Prisma.Decimal | number | string;
  contrapartida: Prisma.Decimal | number | string;
  created_at: Date | string;
  updated_at: Date | string;
};

type EmendaMunicipioRow = {
  emenda_id: bigint | number;
  id: number;
  nome: string;
  cidade: string;
  uf: string;
  cnpj: string;
};

type EmendaDocumentoRow = {
  id: bigint | number;
  emenda_id: bigint | number;
  arquivo_nome_original: string;
  arquivo_path: string;
  mime_type: string | null;
  tamanho: bigint | number | null;
  versao: number;
  created_by_user_id: number | null;
  created_by_email: string;
  updated_by_user_id: number | null;
  updated_by_email: string;
  created_at: Date | string;
  updated_at: Date | string;
};

type EmendaDocumentoAuditoriaRow = {
  id: bigint | number;
  emenda_id: bigint | number;
  documento_id: bigint | number | null;
  acao: string;
  detalhes: Prisma.JsonValue | null;
  user_id: number | null;
  user_email: string;
  user_nome: string | null;
  created_at: Date | string;
};

const toNumberId = (value: bigint | number) => Number(value);

const mapRowsToItems = (rows: EmendaBaseRow[], municipioRows: EmendaMunicipioRow[]) => {
  const municipiosByEmenda = new Map<number, EmendaMunicipioRow[]>();
  municipioRows.forEach((row) => {
    const emendaId = toNumberId(row.emenda_id);
    const bucket = municipiosByEmenda.get(emendaId) ?? [];
    bucket.push(row);
    municipiosByEmenda.set(emendaId, bucket);
  });

  return rows.map((row) => {
    const id = toNumberId(row.id);
    const municipios = municipiosByEmenda.get(id) ?? [];
    return {
      id,
      objeto: row.objeto,
      numero: row.numero,
      parlamentar: row.parlamentar,
      vigencia_inicio:
        row.vigencia_inicio instanceof Date
          ? row.vigencia_inicio.toISOString().slice(0, 10)
          : String(row.vigencia_inicio).slice(0, 10),
      vigencia_fim:
        row.vigencia_fim instanceof Date
          ? row.vigencia_fim.toISOString().slice(0, 10)
          : String(row.vigencia_fim).slice(0, 10),
      valor: Number(row.valor),
      contrapartida: Number(row.contrapartida),
      municipios: municipios
        .map((m) => ({
          id: m.id,
          nome: m.nome,
          cidade: m.cidade,
          uf: m.uf,
          cnpj: m.cnpj
        }))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
      created_at: row.created_at instanceof Date ? row.created_at.toISOString() : new Date(row.created_at).toISOString(),
      updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : new Date(row.updated_at).toISOString()
    };
  });
};

export const listMunicipiosAtendidos = async () => {
  const items = await prisma.convenete.findMany({
    orderBy: [{ nome: "asc" }],
    select: {
      id: true,
      nome: true,
      cidade: true,
      uf: true,
      cnpj: true
    }
  });

  return items.map((item) => ({
    id: item.id,
    nome: item.nome,
    cidade: item.cidade,
    uf: item.uf,
    cnpj: item.cnpj
  }));
};

export const listEmendasEstaduais = async (query: ListEmendasEstaduaisQueryInput) => {
  await ensureEmendasEstaduaisStorage();

  const whereParts: Prisma.Sql[] = [];
  if (query.q && query.q.trim() !== "") {
    const term = `%${query.q.trim()}%`;
    whereParts.push(
      Prisma.sql`(e.objeto ILIKE ${term} OR e.numero ILIKE ${term} OR e.parlamentar ILIKE ${term})`
    );
  }

  if (query.municipio_id !== undefined) {
    whereParts.push(
      Prisma.sql`EXISTS (
        SELECT 1
        FROM emendas_estaduais_municipios x
        WHERE x.emenda_id = e.id
          AND x.convenete_id = ${query.municipio_id}
      )`
    );
  }

  const whereSql =
    whereParts.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(whereParts, " AND ")}`
      : Prisma.sql``;

  const rows = (await prisma.$queryRaw(
    Prisma.sql`
      SELECT
        e.id, e.objeto, e.numero, e.parlamentar, e.vigencia_inicio, e.vigencia_fim,
        e.valor, e.contrapartida, e.created_at, e.updated_at
      FROM emendas_estaduais e
      ${whereSql}
      ORDER BY e.updated_at DESC, e.id DESC
    `
  )) as EmendaBaseRow[];

  if (rows.length === 0) {
    return [];
  }

  const ids = rows.map((row) => toNumberId(row.id));
  const municipioRows = (await prisma.$queryRaw(
    Prisma.sql`
      SELECT
        x.emenda_id, c.id, c.nome, c.cidade, c.uf, c.cnpj
      FROM emendas_estaduais_municipios x
      JOIN "Convenete" c ON c.id = x.convenete_id
      WHERE x.emenda_id IN (${Prisma.join(ids)})
      ORDER BY c.nome ASC
    `
  )) as EmendaMunicipioRow[];

  return mapRowsToItems(rows, municipioRows);
};

const writeMunicipiosAssociation = async (tx: Prisma.TransactionClient, emendaId: number, municipioIds: number[]) => {
  await tx.$executeRaw(
    Prisma.sql`DELETE FROM emendas_estaduais_municipios WHERE emenda_id = ${emendaId}`
  );

  const uniqueIds = Array.from(new Set(municipioIds));
  if (uniqueIds.length === 0) {
    return;
  }

  await tx.$executeRaw(
    Prisma.sql`
      INSERT INTO emendas_estaduais_municipios (emenda_id, convenete_id)
      SELECT ${emendaId}, c.id
      FROM "Convenete" c
      WHERE c.id IN (${Prisma.join(uniqueIds)})
    `
  );
};

export const createEmendaEstadual = async (input: CreateEmendaEstadualInput) => {
  await ensureEmendasEstaduaisStorage();

  const createdId = await prisma.$transaction(async (tx) => {
    const created = (await tx.$queryRaw(
      Prisma.sql`
        INSERT INTO emendas_estaduais (
          objeto, numero, parlamentar, vigencia_inicio, vigencia_fim, valor, contrapartida, updated_at
        ) VALUES (
          ${input.objeto},
          ${input.numero},
          ${input.parlamentar},
          ${input.vigencia_inicio}::date,
          ${input.vigencia_fim}::date,
          ${input.valor},
          ${input.contrapartida},
          NOW()
        )
        RETURNING id
      `
    )) as Array<{ id: bigint | number }>;

    const id = toNumberId(created[0].id);
    await writeMunicipiosAssociation(tx, id, input.municipio_ids);
    return id;
  });

  const items = await listEmendasEstaduais({ q: String(createdId) });
  return items.find((item) => item.id === createdId) ?? null;
};

export const updateEmendaEstadual = async (id: number, input: UpdateEmendaEstadualInput) => {
  await ensureEmendasEstaduaisStorage();

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw(
      Prisma.sql`
        UPDATE emendas_estaduais
        SET
          objeto = ${input.objeto},
          numero = ${input.numero},
          parlamentar = ${input.parlamentar},
          vigencia_inicio = ${input.vigencia_inicio}::date,
          vigencia_fim = ${input.vigencia_fim}::date,
          valor = ${input.valor},
          contrapartida = ${input.contrapartida},
          updated_at = NOW()
        WHERE id = ${id}
      `
    );

    await writeMunicipiosAssociation(tx, id, input.municipio_ids);
  });

  const items = await listEmendasEstaduais({ q: String(id) });
  return items.find((item) => item.id === id) ?? null;
};

export const deleteEmendaEstadual = async (id: number) => {
  await ensureEmendasEstaduaisStorage();
  await prisma.$executeRaw(Prisma.sql`DELETE FROM emendas_estaduais WHERE id = ${id}`);
  return { deleted: true };
};

const ensureEmendaExists = async (emendaId: number) => {
  const rows = (await prisma.$queryRaw(
    Prisma.sql`SELECT id FROM emendas_estaduais WHERE id = ${emendaId} LIMIT 1`
  )) as Array<{ id: bigint | number }>;
  return rows.length > 0;
};

const createDocumentoAuditoria = async (
  tx: Prisma.TransactionClient,
  input: {
    emendaId: number;
    documentoId?: number | null;
    acao: "UPLOAD" | "ALTERACAO" | "EXCLUSAO";
    detalhes?: Prisma.InputJsonValue;
    userId?: number | null;
    userEmail: string;
  }
) => {
  await tx.$executeRaw(
    Prisma.sql`
      INSERT INTO emendas_estaduais_documentos_auditoria (
        emenda_id, documento_id, acao, detalhes, user_id, user_email
      ) VALUES (
        ${input.emendaId},
        ${input.documentoId ?? null},
        ${input.acao},
        ${input.detalhes ?? Prisma.JsonNull}::jsonb,
        ${input.userId ?? null},
        ${input.userEmail}
      )
    `
  );
};

export const listEmendaDocumentos = async (emendaId: number) => {
  await ensureEmendasEstaduaisStorage();

  const rows = (await prisma.$queryRaw(
    Prisma.sql`
      SELECT
        id, emenda_id, arquivo_nome_original, arquivo_path, mime_type, tamanho, versao,
        created_by_user_id, created_by_email, updated_by_user_id, updated_by_email, created_at, updated_at
      FROM emendas_estaduais_documentos
      WHERE emenda_id = ${emendaId}
      ORDER BY updated_at DESC, id DESC
    `
  )) as EmendaDocumentoRow[];

  return rows.map((row) => ({
    id: toNumberId(row.id),
    emenda_id: toNumberId(row.emenda_id),
    arquivo_nome_original: row.arquivo_nome_original,
    mime_type: row.mime_type,
    tamanho: row.tamanho === null ? null : Number(row.tamanho),
    versao: row.versao,
    created_by_user_id: row.created_by_user_id,
    created_by_email: row.created_by_email,
    updated_by_user_id: row.updated_by_user_id,
    updated_by_email: row.updated_by_email,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : new Date(row.created_at).toISOString(),
    updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : new Date(row.updated_at).toISOString()
  }));
};

export const createEmendaDocumento = async (input: {
  emendaId: number;
  arquivoNomeOriginal: string;
  arquivoPath: string;
  mimeType?: string | null;
  tamanho?: number | null;
  userId?: number | null;
  userEmail: string;
}) => {
  await ensureEmendasEstaduaisStorage();
  if (!(await ensureEmendaExists(input.emendaId))) {
    return null;
  }

  const createdId = await prisma.$transaction(async (tx) => {
    const created = (await tx.$queryRaw(
      Prisma.sql`
        INSERT INTO emendas_estaduais_documentos (
          emenda_id, arquivo_nome_original, arquivo_path, mime_type, tamanho, versao,
          created_by_user_id, created_by_email, updated_by_user_id, updated_by_email, updated_at
        ) VALUES (
          ${input.emendaId},
          ${input.arquivoNomeOriginal},
          ${input.arquivoPath},
          ${input.mimeType ?? null},
          ${input.tamanho ?? null},
          1,
          ${input.userId ?? null},
          ${input.userEmail},
          ${input.userId ?? null},
          ${input.userEmail},
          NOW()
        )
        RETURNING id
      `
    )) as Array<{ id: bigint | number }>;

    const id = toNumberId(created[0].id);
    await createDocumentoAuditoria(tx, {
      emendaId: input.emendaId,
      documentoId: id,
      acao: "UPLOAD",
      detalhes: {
        arquivo_nome_original: input.arquivoNomeOriginal,
        versao: 1
      },
      userId: input.userId,
      userEmail: input.userEmail
    });
    return id;
  });

  const items = await listEmendaDocumentos(input.emendaId);
  return items.find((item) => item.id === createdId) ?? null;
};

export const getEmendaDocumentoById = async (emendaId: number, documentoId: number) => {
  await ensureEmendasEstaduaisStorage();
  const rows = (await prisma.$queryRaw(
    Prisma.sql`
      SELECT
        id, emenda_id, arquivo_nome_original, arquivo_path, mime_type, tamanho, versao,
        created_by_user_id, created_by_email, updated_by_user_id, updated_by_email, created_at, updated_at
      FROM emendas_estaduais_documentos
      WHERE emenda_id = ${emendaId} AND id = ${documentoId}
      LIMIT 1
    `
  )) as EmendaDocumentoRow[];
  return rows[0] ?? null;
};

export const updateEmendaDocumento = async (input: {
  emendaId: number;
  documentoId: number;
  arquivoNomeOriginal: string;
  arquivoPath: string;
  mimeType?: string | null;
  tamanho?: number | null;
  userId?: number | null;
  userEmail: string;
}) => {
  await ensureEmendasEstaduaisStorage();

  const updated = await prisma.$transaction(async (tx) => {
    const previous = (await tx.$queryRaw(
      Prisma.sql`
        SELECT
          id, emenda_id, arquivo_nome_original, arquivo_path, mime_type, tamanho, versao
        FROM emendas_estaduais_documentos
        WHERE emenda_id = ${input.emendaId} AND id = ${input.documentoId}
        LIMIT 1
      `
    )) as Array<{
      id: bigint | number;
      emenda_id: bigint | number;
      arquivo_nome_original: string;
      arquivo_path: string;
      mime_type: string | null;
      tamanho: bigint | number | null;
      versao: number;
    }>;

    if (previous.length === 0) {
      return null;
    }

    const prev = previous[0];
    const nextVersion = Number(prev.versao) + 1;
    await tx.$executeRaw(
      Prisma.sql`
        UPDATE emendas_estaduais_documentos
        SET
          arquivo_nome_original = ${input.arquivoNomeOriginal},
          arquivo_path = ${input.arquivoPath},
          mime_type = ${input.mimeType ?? null},
          tamanho = ${input.tamanho ?? null},
          versao = ${nextVersion},
          updated_by_user_id = ${input.userId ?? null},
          updated_by_email = ${input.userEmail},
          updated_at = NOW()
        WHERE id = ${input.documentoId} AND emenda_id = ${input.emendaId}
      `
    );

    await createDocumentoAuditoria(tx, {
      emendaId: input.emendaId,
      documentoId: input.documentoId,
      acao: "ALTERACAO",
      detalhes: {
        arquivo_nome_original_anterior: prev.arquivo_nome_original,
        arquivo_nome_original_novo: input.arquivoNomeOriginal,
        versao_anterior: prev.versao,
        versao_nova: nextVersion
      },
      userId: input.userId,
      userEmail: input.userEmail
    });

    return {
      previousPath: prev.arquivo_path
    };
  });

  if (!updated) {
    return null;
  }

  const items = await listEmendaDocumentos(input.emendaId);
  const item = items.find((doc) => doc.id === input.documentoId) ?? null;
  return {
    item,
    previousPath: updated.previousPath
  };
};

export const deleteEmendaDocumento = async (input: {
  emendaId: number;
  documentoId: number;
  userId?: number | null;
  userEmail: string;
}) => {
  await ensureEmendasEstaduaisStorage();

  return prisma.$transaction(async (tx) => {
    const rows = (await tx.$queryRaw(
      Prisma.sql`
        SELECT id, emenda_id, arquivo_path, arquivo_nome_original
        FROM emendas_estaduais_documentos
        WHERE id = ${input.documentoId} AND emenda_id = ${input.emendaId}
        LIMIT 1
      `
    )) as Array<{
      id: bigint | number;
      emenda_id: bigint | number;
      arquivo_path: string;
      arquivo_nome_original: string;
    }>;

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    await tx.$executeRaw(
      Prisma.sql`DELETE FROM emendas_estaduais_documentos WHERE id = ${input.documentoId} AND emenda_id = ${input.emendaId}`
    );

    await createDocumentoAuditoria(tx, {
      emendaId: input.emendaId,
      documentoId: input.documentoId,
      acao: "EXCLUSAO",
      detalhes: {
        arquivo_nome_original: row.arquivo_nome_original
      },
      userId: input.userId,
      userEmail: input.userEmail
    });

    return { arquivoPath: row.arquivo_path };
  });
};

export const listEmendaDocumentosAuditoria = async (emendaId: number) => {
  await ensureEmendasEstaduaisStorage();

  const rows = (await prisma.$queryRaw(
    Prisma.sql`
      SELECT
        a.id,
        a.emenda_id,
        a.documento_id,
        a.acao,
        a.detalhes,
        a.user_id,
        a.user_email,
        u.nome AS user_nome,
        a.created_at
      FROM emendas_estaduais_documentos_auditoria a
      LEFT JOIN "User" u ON u.id = a.user_id
      WHERE a.emenda_id = ${emendaId}
      ORDER BY a.created_at DESC, a.id DESC
      LIMIT 500
    `
  )) as EmendaDocumentoAuditoriaRow[];

  return rows.map((row) => ({
    id: toNumberId(row.id),
    emenda_id: toNumberId(row.emenda_id),
    documento_id: row.documento_id === null ? null : toNumberId(row.documento_id),
    acao: row.acao,
    detalhes: row.detalhes ?? null,
    user_id: row.user_id,
    user_email: row.user_email,
    user_nome: row.user_nome,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : new Date(row.created_at).toISOString()
  }));
};
