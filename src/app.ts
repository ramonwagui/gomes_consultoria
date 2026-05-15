import "express-async-errors";
import "./config/env";
import express, { ErrorRequestHandler, RequestHandler } from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import { createCorsMiddleware, createPublicDocumentosCorsMiddleware } from "./config/cors";

import { authRouter } from "./modules/auth/auth.routes";
import { assistenteRouter } from "./modules/assistente/assistente.routes";
import { auditoriaRouter } from "./modules/auditoria/auditoria.routes";
import { consultaFnsPropostasRouter } from "./modules/consultafns-propostas/consultafns-propostas.routes";
import { convenetesRouter } from "./modules/convenetes/convenetes.routes";
import { consultaCnpjRouter } from "./modules/convenetes/consulta-cnpj.routes";
import { emendasEstaduaisRouter } from "./modules/emendas-estaduais/emendas-estaduais.routes";
import { fnsRepassesRouter } from "./modules/fns-repasses/fns-repasses.routes";
import { instrumentosRouter } from "./modules/instrumentos/instrumentos.routes";
import { instrumentosPublicRouter } from "./modules/instrumentos/instrumentos.public.routes";
import { pagamentosRouter } from "./modules/pagamentos/pagamentos.routes";
import { relatoriosRouter } from "./modules/relatorios/relatorios.routes";
import { simecObrasRouter } from "./modules/simec-obras/simec-obras.routes";
import { simecTermosRouter } from "./modules/simec-termos/simec-termos.routes";
import { sismobRouter } from "./modules/sismob-cidadao/sismob-cidadao.routes";
import { solicitacaoCaixaRouter } from "./modules/solicitacao-caixa/solicitacao-caixa.routes";
import { ticketsEmailRouter } from "./modules/tickets-email/tickets-email.routes";
import { ticketsRouter } from "./modules/tickets/tickets.routes";
import { transferenciasDiscricionariasRouter } from "./modules/transferencias-discricionarias/transferencias-discricionarias.routes";
import { transferenciasEspeciaisRouter } from "./modules/transferencias-especiais/transferencias-especiais.routes";
import { usuariosRouter } from "./modules/usuarios/usuarios.routes";
import { documentosGeracaoRouter } from "./modules/documentos-geracao/documentos-geracao.routes";
import { documentosRouter } from "./modules/documentos/documentos.routes";
import { documentosPublicRouter } from "./modules/documentos/documentos.public.routes";

export const app = express();
const appStartedAt = new Date().toISOString();

const convenetesAliasDeprecationMiddleware: RequestHandler = (_req, res, next) => {
  res.setHeader("Deprecation", "true");
  res.setHeader("Sunset", "Wed, 31 Dec 2026 23:59:59 GMT");
  res.setHeader("Link", '</api/v1/proponentes>; rel="successor-version"');
  res.setHeader("X-API-Deprecated-Route", "/api/v1/convenetes");
  next();
};

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
const corsMiddleware = createCorsMiddleware();
const publicDocumentosCorsMiddleware = createPublicDocumentosCorsMiddleware();

app.use((req, res, next) => {
  if (req.path.startsWith("/api/v1/public/documentos")) {
    return publicDocumentosCorsMiddleware(req, res, next);
  }
  return corsMiddleware(req, res, next);
});
app.options("*", (req, res, next) => {
  if (req.path.startsWith("/api/v1/public/documentos")) {
    return publicDocumentosCorsMiddleware(req, res, next);
  }
  return corsMiddleware(req, res, next);
});
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

app.get("/", (_req, res) => {
  res.type("html").send(`<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Gestconv360 API</title>
  </head>
  <body>
    <h1>Gestconv360 API</h1>
    <p>Servidor ativo.</p>
    <ul>
      <li><a href="/health">GET /health</a></li>
      <li><code>/api/v1/auth</code></li>
      <li><code>/api/v1/instrumentos</code></li>
      <li><code>/api/v1/proponentes</code></li>
      <li><code>/api/v1/convenetes</code> (deprecated - use <code>/api/v1/proponentes</code>)</li>
      <li><code>/api/v1/usuarios</code></li>
      <li><code>/api/v1/tickets</code></li>
      <li><code>/api/v1/tickets-email</code></li>
      <li><code>/api/v1/assistente</code></li>
      <li><code>/api/v1/emendas-estaduais</code></li>
    </ul>
  </body>
</html>`);
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    version: process.env.npm_package_version ?? "unknown",
    timestamp: new Date().toISOString(),
    started_at: appStartedAt,
    pid: process.pid,
    uptime_seconds: Math.floor(process.uptime())
  });
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/public", instrumentosPublicRouter);
app.use("/api/v1/public/documentos", documentosPublicRouter);
app.use("/api/v1/instrumentos", instrumentosRouter);
app.use("/api/v1/pagamentos", pagamentosRouter);
app.use("/api/v1/auditoria", auditoriaRouter);
app.use("/api/v1/proponentes", convenetesRouter);
app.use("/api/v1/convenetes", convenetesAliasDeprecationMiddleware, convenetesRouter);
app.use("/api/v1/consulta-cnpj", consultaCnpjRouter);
app.use("/api/v1/relatorios", relatoriosRouter);
app.use("/api/v1/usuarios", usuariosRouter);
app.use("/api/v1/tickets", ticketsRouter);
app.use("/api/v1/tickets-email", ticketsEmailRouter);
app.use("/api/v1/assistente", assistenteRouter);
app.use("/api/v1/emendas-estaduais", emendasEstaduaisRouter);
app.use("/api/v1/consultafns", consultaFnsPropostasRouter);
app.use("/api/v1/fns", fnsRepassesRouter);
app.use("/api/v1/simec-obras", simecObrasRouter);
app.use("/api/v1/simec-termos", simecTermosRouter);
app.use("/api/v1/sismob-cidadao", sismobRouter);
app.use("/api/v1/solicitacao-caixa", solicitacaoCaixaRouter);
app.use("/api/v1/solicitacoes-caixa", solicitacaoCaixaRouter);
app.use("/api/v1/transferencias-especiais", transferenciasEspeciaisRouter);
app.use("/api/v1/transferencias-discricionarias", transferenciasDiscricionariasRouter);
app.use("/api/v1/documentos-geracao", documentosGeracaoRouter);
app.use("/api/v1/documentos", documentosRouter);

const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error("Request error:", req.method, req.originalUrl, error);
  if (res.headersSent) {
    return;
  }
  res.status(500).json({ message: "Erro interno no servidor." });
};

app.use(errorHandler);

app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl
  });
});
