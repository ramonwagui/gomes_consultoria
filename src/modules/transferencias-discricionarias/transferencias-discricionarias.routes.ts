import { UserRole } from "@prisma/client";
import { Router } from "express";

import { authenticate, authorizeRoles } from "../../middlewares/auth";
import {
  transferenciaDiscricionariaDesembolsoQuerySchema,
  transferenciaDiscricionariaDesembolsoProponenteQuerySchema,
  sugestaoProponentePorCnpjQuerySchema,
  sincronizarTransferenciasDiscricionariasBodySchema,
  transferenciaDiscricionariaQuerySchema
} from "./transferencias-discricionarias.schema";
import {
  cancelarSincronizacaoTransferenciasDiscricionarias,
  complementarConveniosAusentesTransferenciasDiscricionarias,
  listarDesembolsosTransferenciasDiscricionarias,
  listarDesembolsosPorProponenteTransferenciasDiscricionarias,
  listarFiltrosTransferenciasDiscricionarias,
  listarSugestoesProponentePorCnpj,
  listarTransferenciasDiscricionarias,
  obterStatusSincronizacaoTransferenciasDiscricionarias,
  sincronizarTransferenciasDiscricionarias
} from "./transferencias-discricionarias.service";
import { dispararNotificacoesVigenciaTransferenciasDiscricionarias } from "./transferencias-discricionarias-notify.service";
import { monitorarAlteracoesFinanceirasTransferenciasDiscricionarias } from "./transferencias-discricionarias-changes-notify.service";

export const transferenciasDiscricionariasRouter = Router();

transferenciasDiscricionariasRouter.use(authenticate);

transferenciasDiscricionariasRouter.get(
  "/filtros",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (req, res) => {
    try {
      const filtros = await listarFiltrosTransferenciasDiscricionarias(req.user ?? undefined);
      return res.json(filtros);
    } catch (error) {
      return res.status(500).json({
        message: error instanceof Error ? error.message : "Falha ao consultar filtros de transferencias discricionarias."
      });
    }
  }
);

transferenciasDiscricionariasRouter.post(
  "/notificacoes/vigencia/disparar",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO),
  async (req, res) => {
    try {
      const result = await dispararNotificacoesVigenciaTransferenciasDiscricionarias("manual");
      return res.json(result);
    } catch (error) {
      return res.status(500).json({
        message: error instanceof Error ? error.message : "Falha ao disparar notificacoes de vigencia."
      });
    }
  }
);

transferenciasDiscricionariasRouter.post(
  "/notificacoes/alteracoes/disparar",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO),
  async (_req, res) => {
    try {
      const result = await monitorarAlteracoesFinanceirasTransferenciasDiscricionarias("manual");
      return res.json(result);
    } catch (error) {
      return res.status(500).json({
        message: error instanceof Error ? error.message : "Falha ao disparar notificacoes de alteracoes financeiras."
      });
    }
  }
);

transferenciasDiscricionariasRouter.get(
  "/proponentes/sugestoes",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const parsed = sugestaoProponentePorCnpjQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(422).json({
        message: "Payload invalido",
        issues: parsed.error.flatten()
      });
    }

    try {
      const itens = await listarSugestoesProponentePorCnpj(parsed.data.cnpj, parsed.data.limit, req.user ?? undefined);
      return res.json({ itens });
    } catch (error) {
      return res.status(500).json({
        message: error instanceof Error ? error.message : "Falha ao consultar sugestoes de proponentes."
      });
    }
  }
);

transferenciasDiscricionariasRouter.get(
  "/desembolsos/proponente",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const parsed = transferenciaDiscricionariaDesembolsoProponenteQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(422).json({
        message: "Payload invalido",
        issues: parsed.error.flatten()
      });
    }

    try {
      const result = await listarDesembolsosPorProponenteTransferenciasDiscricionarias(parsed.data);
      return res.json(result);
    } catch (error) {
      return res.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Falha ao consultar desembolsos de transferencias discricionarias por proponente."
      });
    }
  }
);

transferenciasDiscricionariasRouter.get(
  "/desembolsos",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const parsed = transferenciaDiscricionariaDesembolsoQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(422).json({
        message: "Payload invalido",
        issues: parsed.error.flatten()
      });
    }

    try {
      const result = await listarDesembolsosTransferenciasDiscricionarias(parsed.data);
      return res.json(result);
    } catch (error) {
      return res.status(500).json({
        message: error instanceof Error ? error.message : "Falha ao consultar desembolsos de transferencias discricionarias."
      });
    }
  }
);



transferenciasDiscricionariasRouter.get(
  "/propostas",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const parsed = transferenciaDiscricionariaQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(422).json({
        message: "Payload invalido",
        issues: parsed.error.flatten()
      });
    }

    try {
      const result = await listarTransferenciasDiscricionarias(parsed.data, req.user ?? undefined);
      return res.json(result);
    } catch (error) {
      return res.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Falha ao consultar transferencias discricionarias e legais."
      });
    }
  }
);

transferenciasDiscricionariasRouter.get(
  "/sincronizacao",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (_req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    try {
      const status = await obterStatusSincronizacaoTransferenciasDiscricionarias();
      return res.json(status);
    } catch (error) {
      return res.status(500).json({
        message: error instanceof Error ? error.message : "Falha ao consultar status de sincronizacao."
      });
    }
  }
);

transferenciasDiscricionariasRouter.post(
  "/sincronizacao/complementar-convenios-ausentes",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO),
  async (req, res) => {
    try {
      const result = await complementarConveniosAusentesTransferenciasDiscricionarias(req.user ?? undefined);
      return res.json(result);
    } catch (error) {
      return res.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Falha ao complementar convenios ausentes para proponentes atendidos."
      });
    }
  }
);

transferenciasDiscricionariasRouter.post(
  "/sincronizacao/cancelar",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO),
  async (_req, res) => {
    try {
      const result = await cancelarSincronizacaoTransferenciasDiscricionarias();
      return res.json(result);
    } catch (error) {
      return res.status(500).json({
        message: error instanceof Error ? error.message : "Falha ao interromper sincronizacao."
      });
    }
  }
);

transferenciasDiscricionariasRouter.post(
  "/sincronizar",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const parsed = sincronizarTransferenciasDiscricionariasBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(422).json({
        message: "Payload invalido",
        issues: parsed.error.flatten()
      });
    }

    try {
      const result = await sincronizarTransferenciasDiscricionarias({
        force: parsed.data.force,
        mode: parsed.data.mode
      }, req.user ?? undefined);
      return res.json(result);
    } catch (error) {
      return res.status(502).json({
        message: error instanceof Error ? error.message : "Falha ao sincronizar transferencias discricionarias."
      });
    }
  }
);

