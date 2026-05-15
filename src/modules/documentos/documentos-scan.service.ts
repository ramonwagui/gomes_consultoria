import { DocumentoAuditAction, DocumentoScanStatus, DocumentoAreaStatus, Prisma } from "@prisma/client";

import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import {
  createAreaDocumentObjectKey,
  deleteDocumentObject,
  getDocumentObjectBuffer,
  putDocumentObject
} from "../../lib/storage/r2-storage";
import { validateDocumentoFileIntegrity } from "./documentos.util";

const SYSTEM_EMAIL = "sistema@local";
const SCAN_PROVIDER = "LOCAL_SIGNATURE_SCAN";

const createAudit = async (
  tx: Prisma.TransactionClient,
  input: {
    documentoId: number;
    action: DocumentoAuditAction;
    arquivoNome: string;
    detalhes: Prisma.InputJsonValue;
  }
) =>
  tx.documentoAuditLog.create({
    data: {
      documentoId: input.documentoId,
      userId: null,
      userEmail: SYSTEM_EMAIL,
      userNome: "Worker Antivirus",
      action: input.action,
      arquivoNome: input.arquivoNome,
      detalhes: input.detalhes
    }
  });

const claimDocumento = async (documentoId: number) => {
  const claimed = await prisma.documentoArea.updateMany({
    where: { id: documentoId, scanStatus: DocumentoScanStatus.PENDENTE, status: DocumentoAreaStatus.ATIVO },
    data: {
      scanStatus: DocumentoScanStatus.PROCESSANDO,
      scanProvider: SCAN_PROVIDER,
      scanResult: "Processando varredura antivirus.",
      scannedAt: new Date()
    }
  });
  return claimed.count > 0;
};

const markErro = async (documentoId: number, nomeAtual: string, reason: string) => {
  await prisma.$transaction(async (tx) => {
    await tx.documentoArea.update({
      where: { id: documentoId },
      data: {
        scanStatus: DocumentoScanStatus.ERRO_SCAN,
        scanProvider: SCAN_PROVIDER,
        scanResult: reason.slice(0, 500),
        scannedAt: new Date()
      }
    });
    await createAudit(tx, {
      documentoId,
      action: DocumentoAuditAction.SCAN_ERRO,
      arquivoNome: nomeAtual,
      detalhes: { provider: SCAN_PROVIDER, mensagem: reason }
    });
  });
};

const markInfectado = async (documentoId: number, nomeAtual: string, reason: string) => {
  await prisma.$transaction(async (tx) => {
    await tx.documentoArea.update({
      where: { id: documentoId },
      data: {
        scanStatus: DocumentoScanStatus.INFECTADO,
        scanProvider: SCAN_PROVIDER,
        scanResult: reason.slice(0, 500),
        scannedAt: new Date()
      }
    });
    await createAudit(tx, {
      documentoId,
      action: DocumentoAuditAction.SCAN_INFECTADO,
      arquivoNome: nomeAtual,
      detalhes: { provider: SCAN_PROVIDER, mensagem: reason }
    });
  });
};

const markLimpoAndPromote = async (input: {
  documentoId: number;
  nomeAtual: string;
  mimeType: string | null;
  quarantinePath: string;
  buffer: Buffer;
}) => {
  const activePath = createAreaDocumentObjectKey(input.nomeAtual);
  await putDocumentObject({
    key: activePath,
    buffer: input.buffer,
    contentType: input.mimeType ?? "application/octet-stream"
  });

  await prisma.$transaction(async (tx) => {
    await tx.documentoArea.update({
      where: { id: input.documentoId },
      data: {
        arquivoPath: activePath,
        quarantinePath: null,
        scanStatus: DocumentoScanStatus.LIMPO,
        scanProvider: SCAN_PROVIDER,
        scanResult: "Documento limpo e promovido da quarentena para area ativa.",
        scannedAt: new Date()
      }
    });
    await createAudit(tx, {
      documentoId: input.documentoId,
      action: DocumentoAuditAction.SCAN_LIMPO,
      arquivoNome: input.nomeAtual,
      detalhes: {
        provider: SCAN_PROVIDER,
        from: input.quarantinePath,
        to: activePath
      }
    });
  });

  await deleteDocumentObject(input.quarantinePath).catch(() => undefined);
};

export const runDocumentosScanCycle = async () => {
  const batchSize = Number.isFinite(env.documentosScanBatchSize) ? Math.max(1, env.documentosScanBatchSize) : 10;

  const pendentes = await prisma.documentoArea.findMany({
    where: { status: DocumentoAreaStatus.ATIVO, scanStatus: DocumentoScanStatus.PENDENTE },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: batchSize,
    select: {
      id: true,
      nomeAtual: true,
      nomeOriginal: true,
      mimeType: true,
      tamanho: true,
      arquivoPath: true,
      quarantinePath: true
    }
  });

  let processados = 0;
  let limpos = 0;
  let infectados = 0;
  let erros = 0;

  for (const doc of pendentes) {
    const claimed = await claimDocumento(doc.id);
    if (!claimed) {
      continue;
    }

    processados += 1;
    const origemPath = doc.quarantinePath ?? doc.arquivoPath;

    try {
      const buffer = await getDocumentObjectBuffer(origemPath);
      if (!buffer) {
        erros += 1;
        await markErro(doc.id, doc.nomeAtual, "Arquivo de quarentena nao encontrado para varredura.");
        continue;
      }

      try {
        validateDocumentoFileIntegrity({
          buffer,
          originalname: doc.nomeOriginal,
          mimetype: doc.mimeType ?? "application/octet-stream"
        });
      } catch (error) {
        infectados += 1;
        await markInfectado(
          doc.id,
          doc.nomeAtual,
          error instanceof Error ? error.message : "Arquivo reprovado na varredura de assinatura binaria."
        );
        continue;
      }

      await markLimpoAndPromote({
        documentoId: doc.id,
        nomeAtual: doc.nomeAtual,
        mimeType: doc.mimeType,
        quarantinePath: origemPath,
        buffer
      });
      limpos += 1;
    } catch (error) {
      erros += 1;
      await markErro(
        doc.id,
        doc.nomeAtual,
        error instanceof Error ? error.message : "Falha inesperada no worker de varredura."
      );
    }
  }

  return {
    encontrados: pendentes.length,
    processados,
    limpos,
    infectados,
    erros
  };
};
