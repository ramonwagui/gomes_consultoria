import { createHash } from "crypto";
import { createReadStream, promises as fs } from "fs";
import os from "os";
import path from "path";
import { execFile } from "child_process";

import { env } from "../config/env";
import { copyBucketObject, deleteObjectFromBucket, listBucketObjects, putObjectInBucket } from "../lib/storage/r2-storage";

type BackupMode = "hourly" | "daily" | "monthly";

type BackupManifest = {
  timestamp: string;
  tipo: BackupMode;
  postgres: {
    arquivo: string;
    tamanhoBytes: number;
    sha256: string;
    duracaoSegundos: number;
    sucesso: boolean;
  };
  r2: {
    totalArquivos: number;
    totalBytes: number;
    sucesso: boolean;
  };
  versaoSchema: string;
};

type BucketObject = {
  key: string;
  size: number;
  lastModified: Date | null;
};

const runExecFile = (
  command: string,
  args: string[],
  options?: {
    logStdout?: boolean;
    logStderr?: boolean;
  }
) =>
  new Promise<void>((resolve, reject) => {
    execFile(command, args, { maxBuffer: 1024 * 1024 * 64 }, (error, stdout, stderr) => {
      const shouldLogStdout = options?.logStdout ?? true;
      const shouldLogStderr = options?.logStderr ?? true;

      if (shouldLogStdout && stdout.trim()) {
        console.log(stdout.trim());
      }
      if (shouldLogStderr && stderr.trim()) {
        console.log(stderr.trim());
      }
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

const clampCompressLevel = (value: number) => {
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.min(9, Math.max(0, Math.trunc(value)));
};

const fileExists = async (filePath: string) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const tryResolvePgToolByMajor = async (tool: "pg_dump" | "pg_restore", major: number) => {
  if (!Number.isFinite(major) || major <= 0) {
    return null;
  }

  const candidate = `/usr/lib/postgresql/${major}/bin/${tool}`;
  if (await fileExists(candidate)) {
    return candidate;
  }
  return null;
};

const parseServerMajorFromMismatch = (message: string) => {
  const match = message.match(/server version:\s*(\d+)/i);
  if (!match) {
    return null;
  }
  const major = Number(match[1]);
  return Number.isFinite(major) ? major : null;
};

const resolveBackupDatabaseUrl = () => {
  const backupUrl = process.env.BACKUP_DATABASE_URL?.trim();
  if (backupUrl) {
    return backupUrl;
  }
  const directUrl = process.env.DIRECT_URL?.trim();
  if (directUrl) {
    return directUrl;
  }
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl) {
    return databaseUrl;
  }
  throw new Error("DATABASE_URL nao configurado.");
};

const pad2 = (value: number) => String(value).padStart(2, "0");

const getClockParts = (timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date());

  const byType = new Map(parts.map((part) => [part.type, part.value]));
  const year = byType.get("year") ?? "0000";
  const month = byType.get("month") ?? "00";
  const day = byType.get("day") ?? "00";
  const hour = byType.get("hour") ?? "00";
  const minute = byType.get("minute") ?? "00";
  const second = byType.get("second") ?? "00";

  return {
    dateLabel: `${year}-${month}-${day}`,
    stamp: `${year}${month}${day}_${hour}${minute}${second}`
  };
};

const getSchemaHash = async () => {
  const schemaPath = path.resolve(process.cwd(), "prisma", "schema.prisma");
  const schemaContent = await fs.readFile(schemaPath);
  return createHash("sha256").update(schemaContent).digest("hex");
};

const hashFileSha256 = async (filePath: string) =>
  new Promise<string>((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });

const listAllObjects = async (bucket: string, prefix: string) => {
  const objects: BucketObject[] = [];
  let continuationToken: string | undefined;

  while (true) {
    const page = await listBucketObjects({
      bucket,
      prefix,
      continuationToken
    });

    for (const item of page.Contents ?? []) {
      if (!item.Key) {
        continue;
      }
      objects.push({
        key: item.Key,
        size: Number(item.Size ?? 0),
        lastModified: item.LastModified ?? null
      });
    }

    if (!page.IsTruncated || !page.NextContinuationToken) {
      break;
    }
    continuationToken = page.NextContinuationToken;
  }

  return objects;
};

const buildCutoffMonthsAgo = (months: number) => {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - months);
  return cutoff;
};

const deleteObjectsOlderThan = async (bucket: string, prefix: string, cutoff: Date) => {
  const objects = await listAllObjects(bucket, prefix);
  const toDelete = objects.filter((item) => item.lastModified && item.lastModified.getTime() < cutoff.getTime());

  for (const item of toDelete) {
    await deleteObjectFromBucket({ bucket, key: item.key });
  }

  return toDelete.length;
};

const assertRequiredConfig = () => {
  void resolveBackupDatabaseUrl();
  if (!env.r2Enabled || !env.r2AccountId || !env.r2AccessKeyId || !env.r2SecretAccessKey || !env.r2Bucket) {
    throw new Error("R2 de producao nao configurado. Verifique R2_ENABLED/R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET.");
  }
  if (!env.backupR2Bucket) {
    throw new Error("BACKUP_R2_BUCKET nao configurado.");
  }
};

const runPgDump = async (dumpPath: string) => {
  const dbUrl = resolveBackupDatabaseUrl();
  const compressLevel = clampCompressLevel(env.backupPgCompressLevel);
  const args = [
    "--format=custom",
    `--compress=${compressLevel}`,
    "--no-password",
    "--file",
    dumpPath,
    dbUrl
  ];

  const start = Date.now();
  let dumpPathCommand = env.backupPgDumpPath;
  let serverMajor: number | null = null;

  console.log(`[backup] Executando pg_dump (compress=${compressLevel})...`);
  try {
    await runExecFile(dumpPathCommand, args);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/server version mismatch/i.test(message)) {
      throw error;
    }

    serverMajor = parseServerMajorFromMismatch(message);
    const fallbackDump = serverMajor
      ? await tryResolvePgToolByMajor("pg_dump", serverMajor)
      : null;

    if (!fallbackDump) {
      throw error;
    }

    console.log(
      `[backup] Detectado mismatch de versao. Tentando novamente com ${fallbackDump} para servidor PostgreSQL ${serverMajor}.`
    );
    dumpPathCommand = fallbackDump;
    await runExecFile(dumpPathCommand, args);
  }

  const durationSeconds = Number(((Date.now() - start) / 1000).toFixed(2));
  console.log(`[backup] pg_dump concluido em ${durationSeconds}s.`);

  let restoreCommand = env.backupPgRestorePath;
  if (serverMajor && env.backupPgRestorePath === "pg_restore") {
    const fallbackRestore = await tryResolvePgToolByMajor("pg_restore", serverMajor);
    if (fallbackRestore) {
      restoreCommand = fallbackRestore;
    }
  }
  console.log("[backup] Validando dump com pg_restore --list...");
  await runExecFile(restoreCommand, ["--list", dumpPath], {
    logStdout: false,
    logStderr: false
  });
  console.log("[backup] Validacao do dump concluida.");

  const stats = await fs.stat(dumpPath);
  const sha256 = await hashFileSha256(dumpPath);

  return {
    sizeBytes: stats.size,
    durationSeconds,
    sha256
  };
};

const uploadPostgresDump = async (mode: BackupMode, dumpPath: string, stamp: string, prefix: string) => {
  const key = `${prefix}/postgres/${mode}/${stamp}.dump`;
  await putObjectInBucket({
    bucket: env.backupR2Bucket,
    key,
    body: createReadStream(dumpPath),
    contentType: "application/octet-stream"
  });
  return key;
};

const runR2Snapshot = async (mode: Extract<BackupMode, "daily" | "monthly">, dateLabel: string, prefix: string) => {
  const sourceBucket = env.r2Bucket;
  const destinationBucket = env.backupR2Bucket;
  const sourceObjects = await listAllObjects(sourceBucket, "");

  let copiedFiles = 0;
  let copiedBytes = 0;

  console.log(`[backup] Iniciando snapshot R2 (${mode})...`);
  for (const object of sourceObjects) {
    if (!object.key) {
      continue;
    }
    if (sourceBucket === destinationBucket && object.key.startsWith(`${prefix}/`)) {
      continue;
    }

    const destinationKey = `${prefix}/r2-snapshots/${mode}/${dateLabel}/${object.key}`;
    await copyBucketObject({
      sourceBucket,
      sourceKey: object.key,
      destinationBucket,
      destinationKey
    });

    copiedFiles += 1;
    copiedBytes += object.size;
  }

  return {
    totalArquivos: copiedFiles,
    totalBytes: copiedBytes
  };
};

const runRetention = async (prefix: string) => {
  console.log("[backup] Aplicando retencao...");
  const bucket = env.backupR2Bucket;
  const now = Date.now();
  const hourlyCutoff = new Date(now - Math.max(1, env.backupRetentionHourlyHours) * 60 * 60 * 1000);
  const dailyCutoff = new Date(now - Math.max(1, env.backupRetentionDailyDays) * 24 * 60 * 60 * 1000);
  const monthlyCutoff = buildCutoffMonthsAgo(Math.max(1, env.backupRetentionMonthlyMonths));

  const deletedHourlyPostgres = await deleteObjectsOlderThan(bucket, `${prefix}/postgres/hourly/`, hourlyCutoff);
  const deletedDailyPostgres = await deleteObjectsOlderThan(bucket, `${prefix}/postgres/daily/`, dailyCutoff);
  const deletedMonthlyPostgres = await deleteObjectsOlderThan(bucket, `${prefix}/postgres/monthly/`, monthlyCutoff);
  const deletedDailyR2 = await deleteObjectsOlderThan(bucket, `${prefix}/r2-snapshots/daily/`, dailyCutoff);
  const deletedMonthlyR2 = await deleteObjectsOlderThan(bucket, `${prefix}/r2-snapshots/monthly/`, monthlyCutoff);
  const deletedManifest = await deleteObjectsOlderThan(bucket, `${prefix}/manifests/`, monthlyCutoff);

  return {
    deletedHourlyPostgres,
    deletedDailyPostgres,
    deletedMonthlyPostgres,
    deletedDailyR2,
    deletedMonthlyR2,
    deletedManifest
  };
};

const uploadManifest = async (manifest: BackupManifest, mode: BackupMode, dateLabel: string, stamp: string, prefix: string) => {
  const key = `${prefix}/manifests/${dateLabel}/${stamp}-${mode}.json`;
  await putObjectInBucket({
    bucket: env.backupR2Bucket,
    key,
    body: Buffer.from(JSON.stringify(manifest, null, 2), "utf-8"),
    contentType: "application/json"
  });
  return key;
};

const parseMode = (): BackupMode => {
  const rawMode = (process.argv[2] ?? process.env.BACKUP_MODE ?? "").trim().toLowerCase();
  if (rawMode === "hourly" || rawMode === "daily" || rawMode === "monthly") {
    return rawMode;
  }
  throw new Error("Modo invalido. Use: hourly | daily | monthly");
};

const main = async () => {
  const mode = parseMode();
  assertRequiredConfig();

  const { dateLabel, stamp } = getClockParts(env.backupTimezone);
  const prefix = env.backupPrefix.replace(/^\/+|\/+$/g, "");
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "gestconv360-backup-"));
  const dumpPath = path.join(tmpDir, `postgres-${mode}-${stamp}.dump`);

  const manifest: BackupManifest = {
    timestamp: new Date().toISOString(),
    tipo: mode,
    postgres: {
      arquivo: "",
      tamanhoBytes: 0,
      sha256: "",
      duracaoSegundos: 0,
      sucesso: false
    },
    r2: {
      totalArquivos: 0,
      totalBytes: 0,
      sucesso: mode === "hourly"
    },
    versaoSchema: await getSchemaHash()
  };

  try {
    console.log(`[backup] Iniciando rotina ${mode} em ${manifest.timestamp}`);

    const pgDump = await runPgDump(dumpPath);
    console.log("[backup] Enviando dump para bucket de backup...");
    const dumpKey = await uploadPostgresDump(mode, dumpPath, stamp, prefix);
    console.log("[backup] Dump enviado:", dumpKey);

    manifest.postgres = {
      arquivo: dumpKey,
      tamanhoBytes: pgDump.sizeBytes,
      sha256: pgDump.sha256,
      duracaoSegundos: pgDump.durationSeconds,
      sucesso: true
    };

    if (mode === "daily" || mode === "monthly") {
      const snapshot = await runR2Snapshot(mode, dateLabel, prefix);
      manifest.r2 = {
        totalArquivos: snapshot.totalArquivos,
        totalBytes: snapshot.totalBytes,
        sucesso: true
      };
    }

    const retention = await runRetention(prefix);
    console.log("[backup] Gravando manifesto...");
    const manifestKey = await uploadManifest(manifest, mode, dateLabel, stamp, prefix);

    console.log("[backup] Manifesto gerado:", manifestKey);
    console.log("[backup] Retencao aplicada:", retention);
    console.log("[backup] Concluido com sucesso.");
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
};

main()
  .catch((error) => {
    console.error("[backup] Falha:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
