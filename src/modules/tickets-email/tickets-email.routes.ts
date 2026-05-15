import { UserRole } from "@prisma/client";
import { Router } from "express";

import { authenticate, authorizeRoles } from "../../middlewares/auth";
import { getEmailIngestionOverview, runGmailTicketIngestion } from "./tickets-email.service";

export const ticketsEmailRouter = Router();

ticketsEmailRouter.use(authenticate);
ticketsEmailRouter.use(authorizeRoles(UserRole.ADMIN));

ticketsEmailRouter.get("/status", async (_req, res) => {
  const overview = await getEmailIngestionOverview();
  return res.json(overview);
});

ticketsEmailRouter.post("/sync", async (req, res) => {
  try {
    const reprocessProcessed =
      req.query.reprocess_processed === "true" || req.body?.reprocess_processed === true;
    const maxMessagesRaw = req.query.max_messages ?? req.body?.max_messages;
    const maxMessagesNumber = Number(maxMessagesRaw);
    const maxMessages = Number.isFinite(maxMessagesNumber) ? maxMessagesNumber : undefined;

    const result = await runGmailTicketIngestion({
      reprocessProcessed,
      maxMessages
    });

    return res.json({
      message: reprocessProcessed
        ? "Sincronizacao de tickets por email executada com reprocessamento."
        : "Sincronizacao de tickets por email executada.",
      result
    });
  } catch (error) {
    return res.status(422).json({
      message: error instanceof Error ? error.message : "Falha ao sincronizar caixa de email."
    });
  }
});
