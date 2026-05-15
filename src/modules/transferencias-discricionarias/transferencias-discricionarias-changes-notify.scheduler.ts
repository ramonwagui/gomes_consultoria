import { env } from "../../config/env";
import { monitorarAlteracoesFinanceirasTransferenciasDiscricionarias } from "./transferencias-discricionarias-changes-notify.service";

let running = false;
let lastRunSlot: string | null = null;

const POLL_INTERVAL_MS = 60_000;
const DAILY_SLOT = "03:00";

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
    const result = await monitorarAlteracoesFinanceirasTransferenciasDiscricionarias("sync");
    // eslint-disable-next-line no-console
    console.log("[transferencias-discricionarias-changes-notify] ciclo concluido", result);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[transferencias-discricionarias-changes-notify] falha no ciclo", error);
  } finally {
    running = false;
  }
};

export const startTransferenciasDiscricionariasChangesNotifyScheduler = () => {
  if (!env.transferenciasDiscricionariasNotifyEnabled) {
    return () => {};
  }

  const timeZone = env.transferenciasDiscricionariasNotifyTimezone;
  // eslint-disable-next-line no-console
  console.log(
    `[transferencias-discricionarias-changes-notify] agenda ativa (${timeZone}): ${DAILY_SLOT}`
  );

  const runCycleIfScheduled = async () => {
    const now = getClockInTimeZone(timeZone);
    if (now.hourMinute !== DAILY_SLOT) {
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
