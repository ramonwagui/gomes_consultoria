console.log("[boot] Node.js process starting - L1 check");

process.on("unhandledRejection", (reason) => {
  console.error("[server] Unhandled Rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("[server] Uncaught Exception:", error);
});

const startFallbackServer = (error: unknown, port: number) => {
  console.error("[server] Iniciando fallback HTTP devido a falha no bootstrap da API.");
  const express = require("express");
  const fallbackApp = express();

  // Garante CORS em TODAS as respostas do fallback, incluindo erros
  fallbackApp.use((_req: any, res: any, next: any) => {
    const origin = _req.headers.origin || "*";
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type,X-Requested-With,Accept,Origin");
    if (_req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });

  fallbackApp.get("/health", (_req: any, res: any) => {
    res.status(503).json({
      status: "degraded",
      message: "Falha no bootstrap da API principal",
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  });

  fallbackApp.use((_req: any, res: any) => {
    res.status(503).json({
      message: "API temporariamente indisponivel. Verifique logs de bootstrap.",
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  });

  fallbackApp.listen(port, "0.0.0.0", () => {
    console.log(`[server] Fallback HTTP ONLINE em http://0.0.0.0:${port}`);
  });
};

async function bootstrap() {
  const port = Number(process.env.PORT || 3000);
  try {
    console.log("[server] Preparando inicialização do ambiente...");
    
    // Importa env e cors de forma estatica apenas depois do try
    const { env } = require("./config/env");
    const { app } = require("./app") as { app: any };

    const server = app.listen(port, "0.0.0.0", () => {
      console.log(`[server] Gestconv360 API ONLINE em http://0.0.0.0:${port}`);
      console.log("[server] Verificação de saúde disponível em: /health");
    });

    if (!env.enableBackgroundJobs) {
      console.log("[server] Background jobs desativados (ENABLE_BACKGROUND_JOBS != true).");
    } else {
      console.log("[server] Aguardando 10s para inicializar serviços de background...");

      setTimeout(() => {
        console.log("[server] Iniciando serviços de background (Safe Boot Delayed)...");

        try {
          const { startTicketsEmailPolling } = require("./modules/tickets-email/tickets-email.scheduler");
          const stopTicketsEmail = startTicketsEmailPolling();
          process.on("SIGINT", () => stopTicketsEmail());
          process.on("SIGTERM", () => stopTicketsEmail());
          console.log("[server] ✓ Tickets Email Polling iniciado");
        } catch (e) {
          console.error("[server] ✗ Falha ao iniciar Tickets Email Polling:", e);
        }

        try {
          const { startTransferenciasDiscricionariasPolling } = require("./modules/transferencias-discricionarias/transferencias-discricionarias.scheduler");
          const stopDiscricionarias = startTransferenciasDiscricionariasPolling();
          process.on("SIGINT", () => stopDiscricionarias());
          process.on("SIGTERM", () => stopDiscricionarias());
          console.log("[server] ✓ Transferências Discricionárias Polling iniciado");
        } catch (e) {
          console.error("[server] ✗ Falha ao iniciar Transferências Discricionárias Polling:", e);
        }

        try {
          const { startTransferenciasDiscricionariasNotifyScheduler } = require("./modules/transferencias-discricionarias/transferencias-discricionarias-notify.scheduler");
          const stopDiscricionariasNotify = startTransferenciasDiscricionariasNotifyScheduler();
          process.on("SIGINT", () => stopDiscricionariasNotify());
          process.on("SIGTERM", () => stopDiscricionariasNotify());
          console.log("[server] ✓ Alertas de vigência discricionárias iniciado");
        } catch (e) {
          console.error("[server] ✗ Falha ao iniciar Alertas de vigência discricionárias:", e);
        }

        try {
          const { startTransferenciasDiscricionariasChangesNotifyScheduler } = require("./modules/transferencias-discricionarias/transferencias-discricionarias-changes-notify.scheduler");
          const stopDiscricionariasChangesNotify = startTransferenciasDiscricionariasChangesNotifyScheduler();
          process.on("SIGINT", () => stopDiscricionariasChangesNotify());
          process.on("SIGTERM", () => stopDiscricionariasChangesNotify());
          console.log("[server] ✓ Alertas de alterações financeiras discricionárias iniciado");
        } catch (e) {
          console.error("[server] ✗ Falha ao iniciar Alertas de alterações financeiras discricionárias:", e);
        }

        try {
          const { startTransferenciasEspeciaisMonitoring } = require("./modules/transferencias-especiais/transferencias-especiais.scheduler");
          const stopEspeciais = startTransferenciasEspeciaisMonitoring();
          process.on("SIGINT", () => stopEspeciais());
          process.on("SIGTERM", () => stopEspeciais());
          console.log("[server] ✓ Transferências Especiais Monitoring iniciado");
        } catch (e) {
          console.error("[server] ✗ Falha ao iniciar Transferências Especiais Monitoring:", e);
        }

        try {
          const { startDocumentosScanScheduler } = require("./modules/documentos/documentos-scan.scheduler");
          const stopDocumentosScan = startDocumentosScanScheduler();
          process.on("SIGINT", () => stopDocumentosScan());
          process.on("SIGTERM", () => stopDocumentosScan());
          console.log("[server] Worker de varredura de documentos iniciado");
        } catch (e) {
          console.error("[server] Falha ao iniciar Worker de varredura de documentos:", e);
        }

        try {
          const { ensureTransferenciasDiscricionariasStorage } = require("./modules/transferencias-discricionarias/transferencias-discricionarias.service");
          void ensureTransferenciasDiscricionariasStorage()
            .then(() => {
              console.log("[server] ✓ Armazenamento de discricionárias verificado");
            })
            .catch((error: any) => {
              console.error("[server] ✗ Erro no armazenamento de discricionárias:", error);
            });
        } catch (e) {
          console.error("[server] ✗ Falha ao importar armazenamento de discricionárias:", e);
        }
      }, 10000);
    }

    server.on("error", (error: any) => {
      console.error("[server] HTTP Server Error:", error);
    });

    setInterval(() => {
      const uptime = Math.floor(process.uptime());
      console.log(`[server] Heartbeat: Up for ${uptime}s | Memory: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`);
    }, 60000);

  } catch (criticalError) {
    console.error("[server] CRITICAL FATAL ERROR DURING STARTUP:", criticalError);
    startFallbackServer(criticalError, port);
  }
}

bootstrap();
