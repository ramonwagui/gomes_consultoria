import { UserRole } from "@prisma/client";
import { Router } from "express";

import { authenticate, authorizeRoles } from "../../middlewares/auth";
import {
  fnsEntidadesQuerySchema,
  fnsMunicipiosQuerySchema,
  fnsRepassesDetalheQuerySchema,
  fnsRepassesQuerySchema,
  fnsSaldosTiposContaQuerySchema,
  fnsSyncBodySchema
} from "./fns-repasses.schema";
import {
  listarEntidadesFns,
  listarMunicipiosFns,
  listarRepassesDetalheFns,
  listarRepassesFns,
  listarSaldosTiposContaFns,
  listarUfsFns,
  obterStatusSyncFns,
  sincronizarCacheFns
} from "./fns-repasses.service";

export const fnsRepassesRouter = Router();

fnsRepassesRouter.use(authenticate);

fnsRepassesRouter.get("/status", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO), (_req, res) => {
  return res.json(obterStatusSyncFns());
});

fnsRepassesRouter.get("/ufs", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO), async (_req, res) => {
  try {
    const result = await listarUfsFns();
    return res.json({ itens: result });
  } catch (error) {
    return res.status(502).json({
      message: error instanceof Error ? error.message : "Falha ao consultar UFs na API do FNS."
    });
  }
});

fnsRepassesRouter.get(
  "/municipios",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const parsed = fnsMunicipiosQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(422).json({
        message: "Payload invalido",
        issues: parsed.error.flatten()
      });
    }

    try {
      const result = await listarMunicipiosFns(parsed.data);
      return res.json({ itens: result });
    } catch (error) {
      return res.status(502).json({
        message: error instanceof Error ? error.message : "Falha ao consultar municipios na API do FNS."
      });
    }
  }
);

fnsRepassesRouter.get(
  "/entidades",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const parsed = fnsEntidadesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(422).json({
        message: "Payload invalido",
        issues: parsed.error.flatten()
      });
    }

    try {
      const result = await listarEntidadesFns(parsed.data);
      return res.json({ itens: result });
    } catch (error) {
      return res.status(502).json({
        message: error instanceof Error ? error.message : "Falha ao consultar entidades na API do FNS."
      });
    }
  }
);

fnsRepassesRouter.get(
  "/repasses",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const parsed = fnsRepassesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(422).json({
        message: "Payload invalido",
        issues: parsed.error.flatten()
      });
    }

    try {
      const result = await listarRepassesFns(parsed.data);
      return res.json(result);
    } catch (error) {
      return res.status(502).json({
        message: error instanceof Error ? error.message : "Falha ao consultar repasses na API do FNS."
      });
    }
  }
);

fnsRepassesRouter.get(
  "/repasses/detalhe",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const parsed = fnsRepassesDetalheQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(422).json({
        message: "Payload invalido",
        issues: parsed.error.flatten()
      });
    }

    try {
      const result = await listarRepassesDetalheFns(parsed.data);
      return res.json(result);
    } catch (error) {
      return res.status(502).json({
        message: error instanceof Error ? error.message : "Falha ao consultar detalhe de repasses na API do FNS."
      });
    }
  }
);

fnsRepassesRouter.get(
  "/saldos/tipos-contas",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const parsed = fnsSaldosTiposContaQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(422).json({
        message: "Payload invalido",
        issues: parsed.error.flatten()
      });
    }

    try {
      const result = await listarSaldosTiposContaFns(parsed.data);
      return res.json(result);
    } catch (error) {
      return res.status(502).json({
        message: error instanceof Error ? error.message : "Falha ao consultar saldos por tipo de conta na API do FNS."
      });
    }
  }
);

fnsRepassesRouter.post("/sync", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO), async (req, res) => {
  const parsed = fnsSyncBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      message: "Payload invalido",
      issues: parsed.error.flatten()
    });
  }

  try {
    const result = await sincronizarCacheFns(parsed.data);
    return res.json(result);
  } catch (error) {
    return res.status(502).json({
      message: error instanceof Error ? error.message : "Falha ao sincronizar cache FNS."
    });
  }
});
