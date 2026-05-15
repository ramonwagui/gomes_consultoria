import { env } from "../../config/env";
import { runDocumentosScanCycle } from "./documentos-scan.service";

let running = false;
let lastCycleAt: string | null = null;
let lastCycleResult: {
  encontrados: number;
  processados: number;
  limpos: number;
  infectados: number;
  erros: number;
} | null = null;
let lastError: string | null = null;

const runCycle = async () => {
  if (running) {
    return;
  }

  running = true;
  try {
    const result = await runDocumentosScanCycle();
    lastCycleAt = new Date().toISOString();
    lastCycleResult = result;
    lastError = null;
    // eslint-disable-next-line no-console
    console.log("[documentos-scan] ciclo concluido", result);
  } catch (error) {
    lastCycleAt = new Date().toISOString();
    lastError = error instanceof Error ? error.message : String(error);
    // eslint-disable-next-line no-console
    console.error("[documentos-scan] falha no ciclo", error);
  } finally {
    running = false;
  }
};

export const getDocumentosScanMonitor = async () => {
  const [pendentes, processando, limpos, infectados, errosScan] = await Promise.all([
    runCount("PENDENTE"),
    runCount("PROCESSANDO"),
    runCount("LIMPO"),
    runCount("INFECTADO"),
    runCount("ERRO_SCAN")
  ]);

  return {
    worker_enabled: env.documentosScanWorkerEnabled,
    is_running: running,
    interval_ms: env.documentosScanPollIntervalMs,
    batch_size: env.documentosScanBatchSize,
    queue: { pendentes, processando, limpos, infectados, erros_scan: errosScan },
    last_cycle_at: lastCycleAt,
    last_cycle_result: lastCycleResult,
    last_error: lastError
  };
};

const runCount = (status: "PENDENTE" | "PROCESSANDO" | "LIMPO" | "INFECTADO" | "ERRO_SCAN") =>
  import("../../lib/prisma").then(({ prisma }) =>
    prisma.documentoArea.count({
      where: {
        status: "ATIVO",
        scanStatus: status
      }
    })
  );

export const startDocumentosScanScheduler = () => {
  if (!env.documentosScanWorkerEnabled) {
    return () => {};
  }

  const intervalMs = Number.isFinite(env.documentosScanPollIntervalMs)
    ? Math.max(env.documentosScanPollIntervalMs, 5000)
    : 30000;

  void runCycle();
  const timer = setInterval(() => {
    void runCycle();
  }, intervalMs);

  return () => clearInterval(timer);
};
