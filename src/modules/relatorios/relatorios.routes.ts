import { UserRole } from "@prisma/client";
import { Router } from "express";

import { authenticate, authorizeRoles } from "../../middlewares/auth";
import {
  buildAndamentoInstrumentosReport,
  buildObraReport,
  buildRepasseReport,
  buildTransparenciaReport,
  buildSimecReport
} from "./relatorios.service";
import {
  andamentoInstrumentosReportQuerySchema,
  obraReportQuerySchema,
  repasseReportQuerySchema,
  transparenciaReportQuerySchema,
  simecReportQuerySchema
} from "./relatorios.schema";

export const relatoriosRouter = Router();

const normalizeProponenteAlias = <T extends Record<string, unknown>>(payload: T) => {
  const next = { ...payload } as Record<string, unknown>;
  const conveneteId = next.convenete_id;
  const proponenteId = next.proponente_id;

  if ((conveneteId === undefined || conveneteId === null || conveneteId === "") && proponenteId !== undefined) {
    next.convenete_id = proponenteId;
  }

  return next as T;
};

relatoriosRouter.use(authenticate);

relatoriosRouter.get(
  "/repasses",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const parsed = repasseReportQuerySchema.safeParse(normalizeProponenteAlias(req.query as Record<string, unknown>));
    if (!parsed.success) {
      return res.status(422).json({
        message: "Payload invalido",
        issues: parsed.error.flatten()
      });
    }

    const report = await buildRepasseReport(parsed.data);
    if (!report) {
      return res.status(404).json({ message: "Proponente nao encontrado." });
    }

    return res.json(report);
  }
);

relatoriosRouter.get(
  "/obras",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const parsed = obraReportQuerySchema.safeParse(normalizeProponenteAlias(req.query as Record<string, unknown>));
    if (!parsed.success) {
      return res.status(422).json({
        message: "Payload invalido",
        issues: parsed.error.flatten()
      });
    }

    const report = await buildObraReport(parsed.data);
    return res.json(report);
  }
);

relatoriosRouter.get(
  "/andamento-instrumentos",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const parsed = andamentoInstrumentosReportQuerySchema.safeParse(normalizeProponenteAlias(req.query as Record<string, unknown>));
    if (!parsed.success) {
      return res.status(422).json({
        message: "Payload invalido",
        issues: parsed.error.flatten()
      });
    }

    const report = await buildAndamentoInstrumentosReport(parsed.data);
    return res.json(report);
  }
);

relatoriosRouter.get(
  "/transparencia",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const parsed = transparenciaReportQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(422).json({
        message: "Payload invalido",
        issues: parsed.error.flatten()
      });
    }

    try {
      const report = await buildTransparenciaReport(parsed.data);
      return res.json(report);
    } catch (error) {
      return res.status(502).json({
        message: error instanceof Error ? error.message : "Falha ao consultar dados do Portal da Transparencia."
      });
    }
  }
);

relatoriosRouter.get(
  "/simec-termos",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const parsed = simecReportQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(422).json({
        message: "Payload invalido",
        issues: parsed.error.flatten()
      });
    }

    try {
      console.log(`[api] GET /simec-termos: UF=${parsed.data.uf} MUN=${parsed.data.municipio} ESFERA=${parsed.data.secretaria ?? "auto"}`);
      const report = await buildSimecReport(parsed.data);
      return res.json(report);
    } catch (error) {
      console.error("[api] Erro em /simec-termos:", error);
      return res.status(502).json({
        message: error instanceof Error ? error.message : "Falha ao consultar dados do SIMEC."
      });
    }
  }
);

