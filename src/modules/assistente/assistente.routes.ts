import { UserRole } from "@prisma/client";
import { Router } from "express";

import { authenticate, authorizeRoles } from "../../middlewares/auth";
import { assistentePerguntaBodySchema } from "./assistente.schema";
import { listarSessoesAssistente, obterSessaoAssistente, responderPerguntaAssistente } from "./assistente.service";

export const assistenteRouter = Router();

assistenteRouter.use(authenticate);

assistenteRouter.get(
  "/sessions",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Sessao invalida." });
    }

    const limit = Number(req.query.limit ?? 20);
    try {
      const sessions = await listarSessoesAssistente(userId, Number.isFinite(limit) ? limit : 20);
      return res.json({ itens: sessions });
    } catch (error) {
      return res.status(500).json({
        message: error instanceof Error ? error.message : "Falha ao listar sessoes do assistente."
      });
    }
  }
);

assistenteRouter.get(
  "/sessions/:id",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Sessao invalida." });
    }

    const sessionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    try {
      const session = await obterSessaoAssistente(userId, sessionId);
      if (!session) {
        return res.status(404).json({ message: "Sessao nao encontrada." });
      }
      return res.json(session);
    } catch (error) {
      return res.status(500).json({
        message: error instanceof Error ? error.message : "Falha ao carregar sessao do assistente."
      });
    }
  }
);

assistenteRouter.post(
  "/perguntar",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const parsed = assistentePerguntaBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({
        message: "Payload invalido",
        issues: parsed.error.flatten()
      });
    }

    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Sessao invalida." });
      }

      const result = await responderPerguntaAssistente(parsed.data, { userId });
      return res.json(result);
    } catch (error) {
      return res.status(500).json({
        message: error instanceof Error ? error.message : "Falha ao processar pergunta do assistente."
      });
    }
  }
);
