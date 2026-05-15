import { env } from "../../config/env";
import { monitorarAlteracoesFinanceirasTransferenciasEspeciais } from "./transferencias-especiais-financeiro-notify.service";
import { monitorarMudancasSituacaoTransferenciasEspeciais } from "./transferencias-especiais-notify.service";
import { iniciarSincronizacaoTransferenciasEspeciaisRealtime } from "./transferencias-especiais.service";

let monitorRunning = false;
let syncRunning = false;
let lastSyncRunSlot: string | null = null;

const POLL_INTERVAL_MS = 60_000;

const parseSchedule = (raw: string) => {
  const valid = new Set<string>();
  const invalid: string[] = [];

  for (const piece of raw.split(",")) {
    const slot = piece.trim();
    if (slot === "") {
      continue;
    }

    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(slot)) {
      invalid.push(slot);
      continue;
    }

    valid.add(slot);
  }

  return {
    valid: Array.from(valid).sort(),
    invalid
  };
};

const getClockInTimeZone = (timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date());

  const byType = new Map(parts.map((part) => [part.type, part.value]));
  const year = byType.get("year") ?? "0000";
  const month = byType.get("month") ?? "00";
  const day = byType.get("day") ?? "00";
  const hour = byType.get("hour") ?? "00";
  const minute = byType.get("minute") ?? "00";

  return {
    dateKey: `${year}-${month}-${day}`,
    hourMinute: `${hour}:${minute}`
  };
};

const runMonitorCycle = async () => {
  if (monitorRunning) {
    return;
  }

  monitorRunning = true;
  try {
    const [situacaoResult, financeiroResult] = await Promise.all([
      monitorarMudancasSituacaoTransferenciasEspeciais(),
      monitorarAlteracoesFinanceirasTransferenciasEspeciais("sync")
    ]);
    // eslint-disable-next-line no-console
    console.log("[transferencias-especiais] ciclo de monitoramento concluido", {
      situacao: situacaoResult,
      financeiro: financeiroResult
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[transferencias-especiais] falha no monitoramento", error);
  } finally {
    monitorRunning = false;
  }
};

const runSyncCycle = async () => {
  if (syncRunning) {
    return;
  }

  syncRunning = true;
  try {
    const result = await iniciarSincronizacaoTransferenciasEspeciaisRealtime();
    // eslint-disable-next-line no-console
    console.log("[transferencias-especiais] ciclo de sincronizacao concluido", result);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[transferencias-especiais] falha na sincronizacao", error);
  } finally {
    syncRunning = false;
  }
};

export const startTransferenciasEspeciaisMonitoring = () => {
  if (!env.transferenciasEspeciaisNotifyEnabled && !env.transferenciasEspeciaisSyncEnabled) {
    return () => {};
  }

  const stopHandlers: Array<() => void> = [];

  if (env.transferenciasEspeciaisNotifyEnabled) {
    const intervalMs = Number.isFinite(env.transferenciasEspeciaisNotifyPollIntervalMs)
      ? Math.max(env.transferenciasEspeciaisNotifyPollIntervalMs, 120000)
      : 900000;

    void runMonitorCycle();
    const monitorTimer = setInterval(() => {
      void runMonitorCycle();
    }, intervalMs);

    stopHandlers.push(() => clearInterval(monitorTimer));
  }

  if (env.transferenciasEspeciaisSyncEnabled) {
    const timeZone = env.transferenciasEspeciaisSyncTimezone;
    const parsedSchedule = parseSchedule(env.transferenciasEspeciaisSyncSchedule);

    if (parsedSchedule.invalid.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(
        `[transferencias-especiais] horarios invalidos ignorados: ${parsedSchedule.invalid.join(", ")}`
      );
    }

    if (parsedSchedule.valid.length === 0) {
      // eslint-disable-next-line no-console
      console.warn("[transferencias-especiais] agenda de sincronizacao vazia; nenhum horario configurado.");
    } else {
      const scheduleSet = new Set(parsedSchedule.valid);
      // eslint-disable-next-line no-console
      console.log(`[transferencias-especiais] agenda de sincronizacao ativa (${timeZone}): ${parsedSchedule.valid.join(", ")}`);

      const runSyncIfScheduled = async () => {
        const now = getClockInTimeZone(timeZone);
        if (!scheduleSet.has(now.hourMinute)) {
          return;
        }

        const slotKey = `${now.dateKey} ${now.hourMinute}`;
        if (lastSyncRunSlot === slotKey) {
          return;
        }

        lastSyncRunSlot = slotKey;
        await runSyncCycle();
      };

      void runSyncIfScheduled();
      const syncTimer = setInterval(() => {
        void runSyncIfScheduled();
      }, POLL_INTERVAL_MS);
      stopHandlers.push(() => clearInterval(syncTimer));
    }
  }

  return () => {
    for (const stop of stopHandlers) {
      stop();
    }
  };
};
