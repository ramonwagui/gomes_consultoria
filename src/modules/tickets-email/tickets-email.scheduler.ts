import { env } from "../../config/env";
import { runGmailTicketIngestion } from "./tickets-email.service";

let running = false;

const runCycle = async () => {
  if (running) {
    return;
  }

  running = true;
  try {
    const result = await runGmailTicketIngestion();
    // eslint-disable-next-line no-console
    console.log("[tickets-email] ciclo concluido", result);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[tickets-email] falha no ciclo", error);
  } finally {
    running = false;
  }
};

export const startTicketsEmailPolling = () => {
  if (!env.gmailTicketIngestionEnabled) {
    return () => {};
  }

  const intervalMs = Number.isFinite(env.gmailTicketPollIntervalMs)
    ? Math.max(env.gmailTicketPollIntervalMs, 30000)
    : 120000;

  void runCycle();
  const timer = setInterval(() => {
    void runCycle();
  }, intervalMs);

  return () => clearInterval(timer);
};
