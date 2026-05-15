import { env } from "../../config/env";
import { dispararNotificacoesVigenciaTransferenciasDiscricionarias } from "./transferencias-discricionarias-notify.service";

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
    const result = await dispararNotificacoesVigenciaTransferenciasDiscricionarias("auto");
    // eslint-disable-next-line no-console
    console.log("[transferencias-discricionarias-notify] ciclo concluido", result);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[transferencias-discricionarias-notify] falha no ciclo", error);
  } finally {
    running = false;
  }
};

export const startTransferenciasDiscricionariasNotifyScheduler = () => {
  if (!env.transferenciasDiscricionariasNotifyEnabled) {
    return () => {};
  }

  const timeZone = env.transferenciasDiscricionariasNotifyTimezone;
  const parsedSchedule = parseSchedule(env.transferenciasDiscricionariasNotifySchedule);

  if (parsedSchedule.invalid.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      `[transferencias-discricionarias-notify] horarios invalidos ignorados: ${parsedSchedule.invalid.join(", ")}`
    );
  }

  if (parsedSchedule.valid.length === 0) {
    // eslint-disable-next-line no-console
    console.warn("[transferencias-discricionarias-notify] agenda vazia; fallback para 08:00");
    parsedSchedule.valid.push("08:00");
  }

  const scheduleSet = new Set(parsedSchedule.valid);

  // eslint-disable-next-line no-console
  console.log(
    `[transferencias-discricionarias-notify] agenda ativa (${timeZone}): ${parsedSchedule.valid.join(", ")}`
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
