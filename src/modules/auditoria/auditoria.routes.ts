import { UserRole } from "@prisma/client";
import { Router } from "express";

import { authenticate, authorizeRoles } from "../../middlewares/auth";
import { listAuditQuerySchema } from "./auditoria.schema";
import { listAuditLogs } from "./auditoria.service";

const router = Router();

router.use(authenticate);

router.get("/", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO), async (req, res) => {
  const parsed = listAuditQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(422).json({
      message: "Filtros invalidos",
      issues: parsed.error.flatten()
    });
  }

  try {
    const logs = await listAuditLogs(parsed.data);
    return res.json(
      logs.map((item) => ({
        id: item.id,
        instrumento_id: item.instrumentId,
        user_id: item.userId,
        user_email: item.userEmail,
        acao: item.action,
        campos_alterados: item.changedFields,
        antes: item.beforeData,
        depois: item.afterData,
        created_at: item.createdAt.toISOString()
      }))
    );
  } catch {
    return res.status(500).json({ message: "Erro interno ao listar auditoria." });
  }
});

export { router as auditoriaRouter };
