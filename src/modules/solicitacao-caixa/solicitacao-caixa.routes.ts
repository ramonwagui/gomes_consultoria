import { Router } from "express";
import { SolicitacaoCaixaTipo } from "@prisma/client";

import { authenticate, authorizeRoles } from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import {
  buscarInstrumentosParaSelect,
  listarSolicitacoesCaixa
} from "./solicitacao-caixa.service";

export const solicitacaoCaixaRouter = Router();

solicitacaoCaixaRouter.use(authenticate);

solicitacaoCaixaRouter.get(
  "/instrumentos/search",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const q = (req.query.q as string) || "";
    const resultados = await buscarInstrumentosParaSelect(q);
    return res.json(resultados);
  }
);

solicitacaoCaixaRouter.get(
  "/instrumentos/:instrumentId/solicitacoes",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA, UserRole.DEMONSTRACAO),
  async (req, res) => {
    const instrumentId = Number(req.params.instrumentId);
    if (!instrumentId || Number.isNaN(instrumentId)) {
      return res.status(400).json({ message: "ID de instrumento inválido." });
    }

    const tipo = req.query.tipo as SolicitacaoCaixaTipo | undefined;
    const limit = Number(req.query.limit) || 20;
    const offset = Number(req.query.offset) || 0;

    const { itens, total } = await listarSolicitacoesCaixa(instrumentId, {
      tipo,
      limit,
      offset
    });

    const mapped = (itens as unknown as any[]).map((item: any) => ({
      id: item.id,
      tipo: item.tipo,
      descricao: item.descricao,
      origem_email: item.origemEmail,
      assunto_email: item.assuntoEmail,
      created_at: item.createdAt.toISOString(),
      ticket: item.ticket
        ? {
            id: item.ticket.id,
            codigo: item.ticket.codigo,
            titulo: item.ticket.titulo
          }
        : null
    }));

    return res.json({ itens: mapped, total });
  }
);