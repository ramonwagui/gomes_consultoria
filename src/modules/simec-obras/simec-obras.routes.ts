import { UserRole } from "@prisma/client";
import { Router } from "express";

import { authenticate, authorizeRoles } from "../../middlewares/auth";
import { simecMunicipiosQuerySchema, simecObraParamsSchema, simecObrasQuerySchema } from "./simec-obras.schema";
import { listarMunicipiosSimecObras, listarObrasSimec, listarUfsSimecObras, obterObraSimec } from "./simec-obras.service";

export const simecObrasRouter = Router();

simecObrasRouter.use(authenticate);

simecObrasRouter.get("/ufs", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO), async (_req, res) => {
  try {
    const itens = await listarUfsSimecObras();
    return res.json({ itens });
  } catch (error) {
    return res.status(502).json({
      message: error instanceof Error ? error.message : "Falha ao consultar UFs no SIMEC Obras."
    });
  }
});

simecObrasRouter.get("/municipios", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO), async (req, res) => {
  const parsed = simecMunicipiosQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(422).json({ message: "Payload invalido", issues: parsed.error.flatten() });
  }

  try {
    const itens = await listarMunicipiosSimecObras(parsed.data);
    return res.json({ itens });
  } catch (error) {
    return res.status(502).json({
      message: error instanceof Error ? error.message : "Falha ao consultar municipios no SIMEC Obras."
    });
  }
});

simecObrasRouter.get("/obras", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO), async (req, res) => {
  const parsed = simecObrasQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(422).json({ message: "Payload invalido", issues: parsed.error.flatten() });
  }

  try {
    const result = await listarObrasSimec(parsed.data);
    return res.json(result);
  } catch (error) {
    return res.status(502).json({
      message: error instanceof Error ? error.message : "Falha ao consultar obras no SIMEC."
    });
  }
});

simecObrasRouter.get("/obras/:id", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO), async (req, res) => {
  const parsed = simecObraParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(422).json({ message: "Parametros invalidos", issues: parsed.error.flatten() });
  }

  try {
    const result = await obterObraSimec(parsed.data.id);
    return res.json(result);
  } catch (error) {
    return res.status(502).json({
      message: error instanceof Error ? error.message : "Falha ao consultar detalhe da obra no SIMEC."
    });
  }
});
