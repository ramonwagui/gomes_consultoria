import { env } from "../../config/env";
import { sincronizarTransferenciasDiscricionarias } from "./transferencias-discricionarias.service";

let running = false;
let lastRunSlot: string | null = null;

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

const runCycle = async () => {
  if (running) {
    return;
  }

  running = true;
  try {
    const result = await sincronizarTransferenciasDiscricionarias({
      force: env.transferenciasDiscricionariasSyncForce,
      mode: "full"
    });
    // eslint-disable-next-line no-console
    console.log("[transferencias-discricionarias] ciclo concluido", result);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[transferencias-discricionarias] falha no ciclo", error);
  } finally {
    running = false;
  }
};

export const startTransferenciasDiscricionariasPolling = () => {
  if (!env.transferenciasDiscricionariasSyncEnabled) {
    return () => {};
  }

  const timeZone = env.transferenciasDiscricionariasSyncTimezone;
  const parsedSchedule = parseSchedule(env.transferenciasDiscricionariasSyncSchedule);

  if (parsedSchedule.invalid.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      `[transferencias-discricionarias] horarios invalidos ignorados: ${parsedSchedule.invalid.join(", ")}`
    );
  }

  if (parsedSchedule.valid.length === 0) {
    const intervalMs = Number.isFinite(env.transferenciasDiscricionariasSyncIntervalMs)
      ? Math.max(env.transferenciasDiscricionariasSyncIntervalMs, 300000)
      : 21600000;

    // eslint-disable-next-line no-console
    console.warn(
      `[transferencias-discricionarias] agenda vazia; fallback para intervalo fixo de ${intervalMs} ms`
    );

    void runCycle();
    const fallbackTimer = setInterval(() => {
      void runCycle();
    }, intervalMs);

    return () => clearInterval(fallbackTimer);
  }

  const scheduleSet = new Set(parsedSchedule.valid);

  // eslint-disable-next-line no-console
  console.log(
    `[transferencias-discricionarias] agenda ativa (${timeZone}): ${parsedSchedule.valid.join(", ")}`
  );

  const runCycleIfScheduled = async () => {
    const now = getClockInTimeZone(timeZone);
    if (!scheduleSet.has(now.hourMinute)) {
      return;
    }

    const slotKey = `${now.dateKey} ${now.hourMinute}`;
    if (lastRunSlot === slotKey) {
      return;
    }

    lastRunSlot = slotKey;
    await runCycle();
  };

  void runCycleIfScheduled();
  const timer = setInterval(() => {
    void runCycleIfScheduled();
  }, POLL_INTERVAL_MS);

  return () => clearInterval(timer);
};
