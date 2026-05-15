import { UserRole } from "@prisma/client";
import { Router } from "express";

import { authenticate, authorizeRoles } from "../../middlewares/auth";
import { listarMunicipiosSimecTermos, listarTermosSimec, listarTiposObjetoSimecTermos, listarUfsSimecTermos, obterTermoSimec } from "./simec-termos.service";
import { simecTermoParamsSchema, simecTermosListQuerySchema, simecTermosMunicipiosQuerySchema } from "./simec-termos.schema";

export const simecTermosRouter = Router();

simecTermosRouter.use(authenticate);

simecTermosRouter.get("/ufs", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO), async (_req, res) => {
  try {
    const itens = await listarUfsSimecTermos();
    return res.json({ itens });
  } catch (error) {
    return res.status(502).json({
      message: error instanceof Error ? error.message : "Falha ao consultar UFs no SIMEC Termos."
    });
  }
});

simecTermosRouter.get("/tipos-objeto", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO), async (_req, res) => {
  try {
    const itens = await listarTiposObjetoSimecTermos();
    return res.json({ itens });
  } catch (error) {
    return res.status(502).json({
      message: error instanceof Error ? error.message : "Falha ao consultar tipos de objeto no SIMEC Termos."
    });
  }
});

simecTermosRouter.get("/municipios", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO), async (req, res) => {
  const parsed = simecTermosMunicipiosQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(422).json({ message: "Payload invalido", issues: parsed.error.flatten() });
  }

  try {
    const itens = await listarMunicipiosSimecTermos(parsed.data);
    return res.json({ itens });
  } catch (error) {
    return res.status(502).json({
      message: error instanceof Error ? error.message : "Falha ao consultar municipios no SIMEC Termos."
    });
  }
});

simecTermosRouter.get("/termos", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO), async (req, res) => {
  const parsed = simecTermosListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(422).json({ message: "Payload invalido", issues: parsed.error.flatten() });
  }

  try {
    const result = await listarTermosSimec(parsed.data);
    return res.json(result);
  } catch (error) {
    return res.status(502).json({
      message: error instanceof Error ? error.message : "Falha ao consultar termos no SIMEC."
    });
  }
});

simecTermosRouter.get("/termos/:id", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO), async (req, res) => {
  const parsed = simecTermoParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(422).json({ message: "Parametros invalidos", issues: parsed.error.flatten() });
  }

  try {
    const result = await obterTermoSimec(parsed.data.id);
    return res.json(result);
  } catch (error) {
    return res.status(502).json({
      message: error instanceof Error ? error.message : "Falha ao consultar detalhe do termo SIMEC."
    });
  }
});
