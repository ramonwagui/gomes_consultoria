import { DocumentoAreaStatus, DocumentoAuditAction } from "@prisma/client";

import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { deleteDocumentObject } from "../lib/storage/r2-storage";

const SYSTEM_EMAIL = "sistema@local";
const SYSTEM_NAME = "Backup Purge Worker";
const BATCH_SIZE = 200;

const buildCutoff = () => {
  const days = Number.isFinite(env.documentosHardDeleteDelayDays)
    ? Math.max(1, env.documentosHardDeleteDelayDays)
    : 30;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
};

const main = async () => {
  const cutoff = buildCutoff();
  let totalAnalisados = 0;
  let totalPurgados = 0;
  let totalFalhas = 0;

  while (true) {
    const docs = await prisma.documentoArea.findMany({
      where: {
        status: DocumentoAreaStatus.EXCLUIDO,
        deletedAt: { lte: cutoff },
        purgedAt: null
      },
      orderBy: [{ deletedAt: "asc" }, { id: "asc" }],
      take: BATCH_SIZE,
      select: {
        id: true,
        nomeAtual: true,
        arquivoPath: true,
        quarantinePath: true,
        deletedAt: true
      }
    });

    if (docs.length === 0) {
      break;
    }

    for (const doc of docs) {
      totalAnalisados += 1;

      const keys = Array.from(
        new Set([doc.arquivoPath, doc.quarantinePath].filter((item): item is string => Boolean(item && item.trim())))
      );

      try {
        for (const key of keys) {
          await deleteDocumentObject(key);
        }

        await prisma.$transaction(async (tx) => {
          await tx.documentoArea.update({
            where: { id: doc.id },
            data: { purgedAt: new Date() }
          });

          await tx.documentoAuditLog.create({
            data: {
              documentoId: doc.id,
              userId: null,
              userEmail: SYSTEM_EMAIL,
              userNome: SYSTEM_NAME,
              action: DocumentoAuditAction.EXCLUSAO,
              arquivoNome: doc.nomeAtual,
              detalhes: {
                exclusao: "FISICA_PURGE",
                chaves_removidas: keys,
                deleted_at: doc.deletedAt?.toISOString() ?? null,
                purged_at: new Date().toISOString()
              }
            }
          });
        });

        totalPurgados += 1;
      } catch (error) {
        totalFalhas += 1;
        console.error(
          `[backup:purge-docs] falha ao purgar documento ${doc.id}:`,
          error instanceof Error ? error.message : error
        );
      }
    }
  }

  console.log("[backup:purge-docs] concluido", {
    cutoff: cutoff.toISOString(),
    analisados: totalAnalisados,
    purgados: totalPurgados,
    falhas: totalFalhas
  });
};

main()
  .catch((error) => {
    console.error("[backup:purge-docs] erro fatal", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
