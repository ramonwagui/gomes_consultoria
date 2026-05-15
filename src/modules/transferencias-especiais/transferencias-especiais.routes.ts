import { UserRole } from "@prisma/client";
import { Router } from "express";

import { authenticate, authorizeRoles } from "../../middlewares/auth";
import {
  planoAcaoEspecialQuerySchema,
  sincronizarTransferenciasEspeciaisPorCnpjSchema
} from "./transferencias-especiais.schema";
import {
  cancelarSincronizacaoTransferenciasEspeciaisRealtime,
  iniciarSincronizacaoTransferenciasEspeciaisRealtime,
  iniciarSincronizacaoTransferenciasEspeciaisRealtimePorCnpj,
  listarPlanosAcaoEspeciais,
  obterStatusSincronizacaoTransferenciasEspeciaisRealtime
} from "./transferencias-especiais.service";
import { monitorarAlteracoesFinanceirasTransferenciasEspeciais } from "./transferencias-especiais-financeiro-notify.service";

export const transferenciasEspeciaisRouter = Router();

transferenciasEspeciaisRouter.use(authenticate);

transferenciasEspeciaisRouter.post(
  "/notificacoes/alteracoes-financeiras/disparar",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO),
  async (_req, res) => {
    try {
      const result = await monitorarAlteracoesFinanceirasTransferenciasEspeciais("manual");
      return res.json(result);
    } catch (error) {
      return res.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Falha ao disparar notificacoes de alteracoes financeiras em transferencias especiais."
      });
    }
  }
);

transferenciasEspeciaisRouter.get(
  "/plano-acao",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const parsed = planoAcaoEspecialQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(422).json({
        message: "Payload invalido",
        issues: parsed.error.flatten()
      });
    }

    try {
      const result = await listarPlanosAcaoEspeciais(parsed.data);
      return res.json(result);
    } catch (error) {
      return res.status(502).json({
        message: error instanceof Error ? error.message : "Falha ao consultar dados de transferencias especiais."
      });
    }
  }
);

transferenciasEspeciaisRouter.post(
  "/sincronizar-realtime",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO),
  async (_req, res) => {
    try {
      const result = await iniciarSincronizacaoTransferenciasEspeciaisRealtime();
      return res.status(result.started ? 202 : 409).json(result);
    } catch (error) {
      return res.status(500).json({
        message: error instanceof Error ? error.message : "Falha ao iniciar sincronizacao de transferencias especiais."
      });
    }
  }
);

transferenciasEspeciaisRouter.post(
  "/sincronizar-realtime/cnpj",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const parsed = sincronizarTransferenciasEspeciaisPorCnpjSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({
        message: "Payload invalido",
        issues: parsed.error.flatten()
      });
    }

    try {
      const result = await iniciarSincronizacaoTransferenciasEspeciaisRealtimePorCnpj(parsed.data);
      if (result.started) {
        return res.status(202).json(result);
      }

      if (result.reason === "convenete_not_found") {
        return res.status(404).json(result);
      }

      return res.status(409).json(result);
    } catch (error) {
      return res.status(500).json({
        message: error instanceof Error ? error.message : "Falha ao iniciar sincronizacao de transferencias especiais por CNPJ."
      });
    }
  }
);

transferenciasEspeciaisRouter.get(
  "/sincronizacao-realtime",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (_req, res) => {
    try {
      const status = await obterStatusSincronizacaoTransferenciasEspeciaisRealtime();
      return res.json(status);
    } catch (error) {
      return res.status(500).json({
        message: error instanceof Error ? error.message : "Falha ao consultar status de sincronizacao de transferencias especiais."
      });
    }
  }
);

transferenciasEspeciaisRouter.post(
  "/sincronizacao-realtime/cancelar",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO),
  async (_req, res) => {
    try {
      const result = await cancelarSincronizacaoTransferenciasEspeciaisRealtime();
      return res.status(result.cancelled ? 202 : 409).json(result);
    } catch (error) {
      return res.status(500).json({
        message: error instanceof Error ? error.message : "Falha ao interromper sincronizacao de transferencias especiais."
      });
    }
  }
);
