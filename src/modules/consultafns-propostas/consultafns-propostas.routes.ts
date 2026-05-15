import { UserRole } from "@prisma/client";
import { Router } from "express";

import { authenticate, authorizeRoles } from "../../middlewares/auth";
import {
  consultaFnsMunicipiosQuerySchema,
  consultaFnsPropostasQuerySchema,
  consultaFnsSyncBodySchema
} from "./consultafns-propostas.schema";
import {
  listarConsultaFnsAnos,
  listarConsultaFnsMunicipios,
  listarConsultaFnsPropostas,
  listarConsultaFnsUfs,
  obterConsultaFnsEtapasProposta,
  obterConsultaFnsProposta,
  obterStatusSyncConsultaFns,
  sincronizarConsultaFnsCache
} from "./consultafns-propostas.service";

export const consultaFnsPropostasRouter = Router();

consultaFnsPropostasRouter.use(authenticate);

consultaFnsPropostasRouter.get("/status", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO), (_req, res) => {
  return res.json(obterStatusSyncConsultaFns());
});

consultaFnsPropostasRouter.get("/ufs", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO), async (_req, res) => {
  try {
    const itens = await listarConsultaFnsUfs();
    return res.json({ itens });
  } catch (error) {
    return res.status(502).json({
      message: error instanceof Error ? error.message : "Falha ao consultar UFs do Consulta FNS."
    });
  }
});

consultaFnsPropostasRouter.get(
  "/anos",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (_req, res) => {
    try {
      const itens = await listarConsultaFnsAnos();
      return res.json({ itens });
    } catch (error) {
      return res.status(502).json({
        message: error instanceof Error ? error.message : "Falha ao consultar anos do Consulta FNS."
      });
    }
  }
);

consultaFnsPropostasRouter.get(
  "/municipios",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const parsed = consultaFnsMunicipiosQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(422).json({
        message: "Payload invalido",
        issues: parsed.error.flatten()
      });
    }

    try {
      const itens = await listarConsultaFnsMunicipios(parsed.data);
      return res.json({ itens });
    } catch (error) {
      return res.status(502).json({
        message: error instanceof Error ? error.message : "Falha ao consultar municipios do Consulta FNS."
      });
    }
  }
);

consultaFnsPropostasRouter.get(
  "/propostas",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const parsed = consultaFnsPropostasQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(422).json({
        message: "Payload invalido",
        issues: parsed.error.flatten()
      });
    }

    try {
      const result = await listarConsultaFnsPropostas(parsed.data);
      return res.json(result);
    } catch (error) {
      return res.status(502).json({
        message: error instanceof Error ? error.message : "Falha ao consultar propostas no Consulta FNS."
      });
    }
  }
);

consultaFnsPropostasRouter.get(
  "/propostas/:nuProposta",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const nuProposta = String(req.params.nuProposta ?? "").trim();
    if (nuProposta === "") {
      return res.status(422).json({ message: "Numero da proposta obrigatorio." });
    }

    try {
      const result = await obterConsultaFnsProposta(nuProposta);
      return res.json(result);
    } catch (error) {
      return res.status(502).json({
        message: error instanceof Error ? error.message : "Falha ao consultar detalhe da proposta no Consulta FNS."
      });
    }
  }
);

consultaFnsPropostasRouter.get(
  "/propostas-etapas",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (_req, res) => {
    try {
      const result = await obterConsultaFnsEtapasProposta();
      return res.json(result);
    } catch (error) {
      return res.status(502).json({
        message: error instanceof Error ? error.message : "Falha ao consultar etapas de proposta no Consulta FNS."
      });
    }
  }
);

consultaFnsPropostasRouter.post("/sync", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.DEMONSTRACAO), async (req, res) => {
  const parsed = consultaFnsSyncBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      message: "Payload invalido",
      issues: parsed.error.flatten()
    });
  }

  try {
    const result = await sincronizarConsultaFnsCache(parsed.data);
    return res.json(result);
  } catch (error) {
    return res.status(502).json({
      message: error instanceof Error ? error.message : "Falha ao sincronizar cache do Consulta FNS."
    });
  }
});
