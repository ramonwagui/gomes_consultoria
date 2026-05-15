import dotenv from "dotenv";

dotenv.config();

const nodeEnv = process.env.NODE_ENV ?? "development";
const defaultJwtSecret = "gestconv360-dev-secret";

if (nodeEnv !== "development" && (!process.env.JWT_SECRET || process.env.JWT_SECRET === defaultJwtSecret)) {
  throw new Error("JWT_SECRET obrigatorio fora do ambiente de desenvolvimento.");
}

const authCookieSameSite = (process.env.AUTH_COOKIE_SAMESITE ?? "none").toLowerCase();
const authCookieSecure = process.env.AUTH_COOKIE_SECURE !== "false";

if (authCookieSameSite === "none" && !authCookieSecure) {
  throw new Error("AUTH_COOKIE_SECURE deve ser true quando AUTH_COOKIE_SAMESITE=none.");
}

const readFirstNonEmptyEnv = (...keys: string[]) => {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim() !== "") {
      return value;
    }
  }
  return "";
};

export const env = {
  port: Number(process.env.PORT ?? 3000),
  jwtSecret: process.env.JWT_SECRET ?? defaultJwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
  authCookieDomain: process.env.AUTH_COOKIE_DOMAIN?.trim() || undefined,
  authCookieSecure,
  authCookieSameSite,
  authAccessCookieMaxAgeMs: Number(process.env.AUTH_ACCESS_COOKIE_MAX_AGE_MS ?? 15 * 60 * 1000),
  authRefreshCookieMaxAgeMs: Number(process.env.AUTH_REFRESH_COOKIE_MAX_AGE_MS ?? 7 * 24 * 60 * 60 * 1000),
  authRefreshTokenTtlMs: Number(process.env.AUTH_REFRESH_TOKEN_TTL_MS ?? 7 * 24 * 60 * 60 * 1000),
  authLegacyBearerEnabled: process.env.AUTH_LEGACY_BEARER_ENABLED !== "false",
  transferenciasEspeciaisBaseUrl:
    process.env.TRANSFERENCIAS_ESPECIAIS_BASE_URL ?? "https://api.transferegov.dth.api.gov.br/transferenciasespeciais",
  transferenciasEspeciaisTimeoutMs: Number(process.env.TRANSFERENCIAS_ESPECIAIS_TIMEOUT_MS ?? 15000),
  transferenciasEspeciaisCacheTtlMs: Number(process.env.TRANSFERENCIAS_ESPECIAIS_CACHE_TTL_MS ?? 60000),
  transferenciasEspeciaisSyncEnabled: process.env.TRANSFERENCIAS_ESPECIAIS_SYNC_ENABLED === "true",
  transferenciasEspeciaisSyncSchedule:
    process.env.TRANSFERENCIAS_ESPECIAIS_SYNC_SCHEDULE ?? "09:00,12:00,15:00,18:00,21:00",
  transferenciasEspeciaisSyncTimezone:
    process.env.TRANSFERENCIAS_ESPECIAIS_SYNC_TIMEZONE ?? "America/Sao_Paulo",
  transferenciasEspeciaisNotifyEnabled: process.env.TRANSFERENCIAS_ESPECIAIS_NOTIFY_ENABLED === "true",
  transferenciasEspeciaisNotifyEmails: process.env.TRANSFERENCIAS_ESPECIAIS_NOTIFY_EMAILS ?? "",
  transferenciasEspeciaisNotifyAno: Number(
    process.env.TRANSFERENCIAS_ESPECIAIS_NOTIFY_ANO ?? new Date().getFullYear()
  ),
  transferenciasEspeciaisNotifyPollIntervalMs: Number(
    process.env.TRANSFERENCIAS_ESPECIAIS_NOTIFY_POLL_INTERVAL_MS ?? 900000
  ),
  fnsRepassesBaseUrl: process.env.FNS_REPASSES_BASE_URL ?? "https://investsus-cidadao-bff.saude.gov.br",
  fnsRepassesTimeoutMs: Number(process.env.FNS_REPASSES_TIMEOUT_MS ?? 15000),
  fnsRepassesCacheTtlMs: Number(process.env.FNS_REPASSES_CACHE_TTL_MS ?? 600000),
  consultaFnsBaseUrl: process.env.CONSULTA_FNS_BASE_URL ?? "https://consultafns.saude.gov.br",
  consultaFnsTimeoutMs: Number(process.env.CONSULTA_FNS_TIMEOUT_MS ?? 20000),
  consultaFnsCacheTtlMs: Number(process.env.CONSULTA_FNS_CACHE_TTL_MS ?? 600000),
  simecObrasBaseUrl: process.env.SIMEC_OBRAS_BASE_URL ?? "https://simec.mec.gov.br/painelObras",
  simecObrasTimeoutMs: Number(process.env.SIMEC_OBRAS_TIMEOUT_MS ?? 20000),
  simecObrasCacheTtlMs: Number(process.env.SIMEC_OBRAS_CACHE_TTL_MS ?? 600000),
  simecObrasInsecureTls: process.env.SIMEC_OBRAS_INSECURE_TLS !== "false",
  simecTermosBaseUrl: process.env.SIMEC_TERMOS_BASE_URL ?? "https://simec.mec.gov.br/par/carregaTermos.php",
  simecTermosTimeoutMs: Number(process.env.SIMEC_TERMOS_TIMEOUT_MS ?? 20000),
  simecTermosCacheTtlMs: Number(process.env.SIMEC_TERMOS_CACHE_TTL_MS ?? 600000),
  simecTermosInsecureTls: process.env.SIMEC_TERMOS_INSECURE_TLS !== "false",
  transferenciasDiscricionariasSyncEnabled: process.env.TRANSFERENCIAS_DISCRICIONARIAS_SYNC_ENABLED === "true",
  transferenciasDiscricionariasSyncIntervalMs: Number(
    process.env.TRANSFERENCIAS_DISCRICIONARIAS_SYNC_INTERVAL_MS ?? 21600000
  ),
  transferenciasDiscricionariasSyncSchedule:
    process.env.TRANSFERENCIAS_DISCRICIONARIAS_SYNC_SCHEDULE ?? "00:00",
  transferenciasDiscricionariasSyncTimezone:
    process.env.TRANSFERENCIAS_DISCRICIONARIAS_SYNC_TIMEZONE ?? "America/Sao_Paulo",
  transferenciasDiscricionariasSyncForce:
    process.env.TRANSFERENCIAS_DISCRICIONARIAS_SYNC_FORCE !== "false",
  transferenciasDiscricionariasSourceBaseUrl:
    process.env.TRANSFERENCIAS_DISCRICIONARIAS_SOURCE_BASE_URL ?? "http://repositorio.dados.gov.br/seges/detru",
  transferenciasDiscricionariasSourceFiles:
    process.env.TRANSFERENCIAS_DISCRICIONARIAS_SOURCE_FILES ??
    "siconv_prop_inst_indicadores_estados.csv.zip,siconv_prop_inst_indicadores_municipios.csv.zip,siconv_desembolso.csv.zip",
  transferenciasDiscricionariasCustomSourceDir:
    process.env.TRANSFERENCIAS_DISCRICIONARIAS_CUSTOM_SOURCE_DIR ?? "",
  portalTransparenciaBaseUrl:
    process.env.PORTAL_TRANSPARENCIA_BASE_URL ?? "https://api.portaldatransparencia.gov.br",
  portalTransparenciaApiKey: readFirstNonEmptyEnv(
    "PORTAL_TRANSPARENCIA_API_KEY",
    "PORTAL_DA_TRANSPARENCIA_API_KEY",
    "PORTAL_TRANSPARENCIA_CHAVE_API_DADOS",
    "CHAVE_API_DADOS_PORTAL_TRANSPARENCIA"
  ),
  portalTransparenciaTimeoutMs: Number(process.env.PORTAL_TRANSPARENCIA_TIMEOUT_MS ?? 20000),
  portalTransparenciaCacheTtlMs: Number(process.env.PORTAL_TRANSPARENCIA_CACHE_TTL_MS ?? 600000),
  transferenciasDiscricionariasRequestTimeoutMs: Number(
    process.env.TRANSFERENCIAS_DISCRICIONARIAS_REQUEST_TIMEOUT_MS ?? 180000
  ),
  transferenciasDiscricionariasDownloadRetries: Number(
    process.env.TRANSFERENCIAS_DISCRICIONARIAS_DOWNLOAD_RETRIES ?? 3
  ),
  transferenciasDiscricionariasMinTotalRatio: Number(
    process.env.TRANSFERENCIAS_DISCRICIONARIAS_MIN_TOTAL_RATIO ?? 0.6
  ),
  transferenciasDiscricionariasNotifyEnabled:
    process.env.TRANSFERENCIAS_DISCRICIONARIAS_NOTIFY_ENABLED === "true",
  transferenciasDiscricionariasNotifyEmails:
    process.env.TRANSFERENCIAS_DISCRICIONARIAS_NOTIFY_EMAILS ?? "",
  transferenciasDiscricionariasNotifySchedule:
    process.env.TRANSFERENCIAS_DISCRICIONARIAS_NOTIFY_SCHEDULE ?? "08:00",
  transferenciasDiscricionariasNotifyTimezone:
    process.env.TRANSFERENCIAS_DISCRICIONARIAS_NOTIFY_TIMEZONE ?? "America/Sao_Paulo",
  transferenciasDiscricionariasNotifyDays:
    process.env.TRANSFERENCIAS_DISCRICIONARIAS_NOTIFY_DAYS ?? "90,60,30",
  gmailTicketIngestionEnabled: process.env.GMAIL_TICKET_INGESTION_ENABLED === "true",
  gmailClientId: process.env.GMAIL_CLIENT_ID ?? "",
  gmailClientSecret: process.env.GMAIL_CLIENT_SECRET ?? "",
  gmailRefreshToken: process.env.GMAIL_REFRESH_TOKEN ?? "",
  gmailUserEmail: process.env.GMAIL_USER_EMAIL ?? "",
  gmailTicketSystemUserEmail: process.env.GMAIL_TICKET_SYSTEM_USER_EMAIL ?? "",
  gmailTicketAllowedDomains: process.env.GMAIL_TICKET_ALLOWED_DOMAINS ?? "",
  gmailTicketQuery: process.env.GMAIL_TICKET_QUERY ?? "in:inbox",
  gmailTicketPollIntervalMs: Number(process.env.GMAIL_TICKET_POLL_INTERVAL_MS ?? 120000),
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o",
  openaiEmbeddingModel: process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
  assistentePgvectorEnabled: process.env.ASSISTENTE_PGVECTOR_ENABLED === "true",
  assistentePgvectorDatabaseUrl: process.env.ASSISTENTE_PGVECTOR_DATABASE_URL ?? "",
  assistentePgvectorTopK: Number(process.env.ASSISTENTE_PGVECTOR_TOP_K ?? 8),
  aiTicketSummaryEnabled: process.env.AI_TICKET_SUMMARY_ENABLED === "true",
  aiDocumentSummaryEnabled: process.env.AI_DOCUMENT_SUMMARY_ENABLED === "true",
  aiDocumentQaEnabled: process.env.AI_DOCUMENT_QA_ENABLED === "true",
  aiDocumentSemanticEnabled: process.env.AI_DOCUMENT_SEMANTIC_ENABLED === "true",
  aiDocumentClassificationEnabled: process.env.AI_DOCUMENT_CLASSIFICATION_ENABLED === "true",
  aiDocumentOcrEnabled: process.env.AI_DOCUMENT_OCR_ENABLED === "true",
  documentosMaxFilesPerBatch: Number(process.env.DOCUMENTOS_MAX_FILES_PER_BATCH ?? 20),
  documentosMaxFileSizeMb: Number(process.env.DOCUMENTOS_MAX_FILE_SIZE_MB ?? 15),
  documentosMaxBatchSizeMb: Number(process.env.DOCUMENTOS_MAX_BATCH_SIZE_MB ?? 150),
  documentosScanWorkerEnabled: process.env.DOCUMENTOS_SCAN_WORKER_ENABLED !== "false",
  documentosScanPollIntervalMs: Number(process.env.DOCUMENTOS_SCAN_POLL_INTERVAL_MS ?? 30000),
  documentosScanBatchSize: Number(process.env.DOCUMENTOS_SCAN_BATCH_SIZE ?? 10),
  ocrSpaceApiKey: process.env.OCR_SPACE_API_KEY ?? "",
  ocrSpaceLanguage: process.env.OCR_SPACE_LANGUAGE ?? "por",
  r2Enabled: process.env.R2_ENABLED === "true",
  r2AccountId: process.env.R2_ACCOUNT_ID ?? "",
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  r2Bucket: process.env.R2_BUCKET ?? "",
  backupR2Bucket: process.env.BACKUP_R2_BUCKET ?? "",
  backupPrefix: process.env.BACKUP_PREFIX ?? "gestconv360-backups",
  backupTimezone: process.env.BACKUP_TIMEZONE ?? "America/Sao_Paulo",
  backupRetentionHourlyHours: Number(process.env.BACKUP_RETENTION_HOURLY_HOURS ?? 48),
  backupRetentionDailyDays: Number(process.env.BACKUP_RETENTION_DAILY_DAYS ?? 30),
  backupRetentionMonthlyMonths: Number(process.env.BACKUP_RETENTION_MONTHLY_MONTHS ?? 12),
  backupPgCompressLevel: Number(process.env.BACKUP_PG_COMPRESS_LEVEL ?? 1),
  backupPgDumpPath: process.env.BACKUP_PG_DUMP_PATH ?? "pg_dump",
  backupPgRestorePath: process.env.BACKUP_PG_RESTORE_PATH ?? "pg_restore",
  documentosHardDeleteDelayDays: Number(process.env.DOCUMENTOS_HARD_DELETE_DELAY_DAYS ?? 30),
  enableBackgroundJobs: process.env.ENABLE_BACKGROUND_JOBS === "true"
};
