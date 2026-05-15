import { randomUUID } from "crypto";
import { Readable } from "stream";
import path from "path";
import { promises as fs } from "fs";

import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
  S3ServiceException
} from "@aws-sdk/client-s3";

import { env } from "../../config/env";

let r2Client: S3Client | null = null;

const localStorageRoot = path.resolve(process.cwd(), "uploads", "local-storage");

const ensureLocalStorageDir = async () => {
  await fs.mkdir(localStorageRoot, { recursive: true });
};

const isR2Available = () => {
  return env.r2Enabled && env.r2AccountId && env.r2AccessKeyId && env.r2SecretAccessKey && env.r2Bucket;
};

const assertR2Config = () => {
  if (!isR2Available()) {
    throw new Error("R2 nao habilitado. Configure R2_ENABLED=true para usar armazenamento de documentos.");
  }
};

const getR2Client = () => {
  assertR2Config();

  if (!r2Client) {
    r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${env.r2AccountId}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.r2AccessKeyId,
        secretAccessKey: env.r2SecretAccessKey
      }
    });
  }

  return r2Client;
};

const buildCopySource = (bucket: string, key: string) => {
  const encodedKey = key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${bucket}/${encodedKey}`;
};

export const listBucketObjects = async (params: {
  bucket: string;
  prefix?: string;
  continuationToken?: string;
}) => {
  const client = getR2Client();
  return client.send(
    new ListObjectsV2Command({
      Bucket: params.bucket,
      Prefix: params.prefix,
      ContinuationToken: params.continuationToken
    })
  );
};

export const copyBucketObject = async (params: {
  sourceBucket: string;
  sourceKey: string;
  destinationBucket: string;
  destinationKey: string;
}) => {
  const client = getR2Client();
  await client.send(
    new CopyObjectCommand({
      CopySource: buildCopySource(params.sourceBucket, params.sourceKey),
      Bucket: params.destinationBucket,
      Key: params.destinationKey
    })
  );
};

export const putObjectInBucket = async (params: {
  bucket: string;
  key: string;
  body: Buffer | Uint8Array | string | Readable;
  contentType?: string;
}) => {
  const client = getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType ?? "application/octet-stream"
    })
  );
};

export const deleteObjectFromBucket = async (params: { bucket: string; key: string }) => {
  const client = getR2Client();
  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: params.bucket,
        Key: params.key
      })
    );
  } catch (error) {
    if (isNotFoundError(error)) {
      return;
    }
    throw error;
  }
};

const streamToBuffer = async (body: unknown): Promise<Buffer> => {
  if (!body) {
    return Buffer.alloc(0);
  }

  if (Buffer.isBuffer(body)) {
    return body;
  }

  if (body instanceof Uint8Array) {
    return Buffer.from(body);
  }

  if (typeof body === "string") {
    return Buffer.from(body);
  }

  if (typeof body === "object" && body !== null && "transformToByteArray" in body) {
    const bytes = await (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
    return Buffer.from(bytes);
  }

  if (body instanceof Readable || (typeof body === "object" && body !== null && Symbol.asyncIterator in body)) {
    const chunks: Buffer[] = [];
    for await (const chunk of body as AsyncIterable<Buffer | Uint8Array | string>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  return Buffer.alloc(0);
};

const isNotFoundError = (error: unknown) => {
  if (error instanceof NoSuchKey) {
    return true;
  }

  if (error instanceof S3ServiceException) {
    return error.name === "NoSuchKey" || error.name === "NotFound" || error.$metadata.httpStatusCode === 404;
  }

  return false;
};

export const createDocumentObjectKey = () => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `documents/${year}/${month}/${Date.now()}-${randomUUID()}.pdf`;
};

export const createAreaDocumentObjectKey = (originalName: string) => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const extension = path.extname(originalName).toLowerCase();
  return `documents-area/${year}/${month}/${Date.now()}-${randomUUID()}${extension}`;
};

export const createAreaQuarantineObjectKey = (originalName: string) => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const extension = path.extname(originalName).toLowerCase();
  return `documents-area/quarantine/${year}/${month}/${Date.now()}-${randomUUID()}${extension}`;
};

export const createConveneteLogoObjectKey = (conveneteId: number, mimeType?: string) => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const extension = mimeType === "image/png" ? "png" : "jpg";
  return `proponentes/logos/${year}/${month}/${conveneteId}-${Date.now()}-${randomUUID()}.${extension}`;
};

export const buildSignedDocumentObjectKey = (documentObjectKey: string) => {
  return documentObjectKey.endsWith(".pdf")
    ? `${documentObjectKey.slice(0, -4)}-assinado.pdf`
    : `${documentObjectKey}-assinado.pdf`;
};

export const putDocumentObject = async (params: {
  key: string;
  buffer: Buffer;
  contentType?: string;
}) => {
  if (!isR2Available()) {
    await ensureLocalStorageDir();
    const localPath = path.join(localStorageRoot, params.key);
    await fs.mkdir(path.dirname(localPath), { recursive: true });
    await fs.writeFile(localPath, params.buffer);
    return params.key;
  }
  const client = getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: env.r2Bucket,
      Key: params.key,
      Body: params.buffer,
      ContentType: params.contentType ?? "application/pdf"
    })
  );
  return params.key;
};

export const putConveneteLogoObject = async (params: {
  key: string;
  buffer: Buffer;
  contentType?: string;
}) => {
  if (!isR2Available()) {
    await ensureLocalStorageDir();
    const localPath = path.join(localStorageRoot, params.key);
    await fs.mkdir(path.dirname(localPath), { recursive: true });
    await fs.writeFile(localPath, params.buffer);
    return params.key;
  }
  const client = getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: env.r2Bucket,
      Key: params.key,
      Body: params.buffer,
      ContentType: params.contentType ?? "image/jpeg"
    })
  );
  return params.key;
};

export const getDocumentObjectBuffer = async (key: string) => {
  if (!isR2Available()) {
    const localPath = path.join(localStorageRoot, key);
    try {
      return await fs.readFile(localPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }
  const client = getR2Client();
  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: env.r2Bucket,
        Key: key
      })
    );

    return await streamToBuffer(response.Body);
  } catch (error) {
    if (isNotFoundError(error)) {
      return null;
    }
    throw error;
  }
};

export const getConveneteLogoObjectBuffer = async (key: string) => {
  if (!isR2Available()) {
    const localPath = path.join(localStorageRoot, key);
    try {
      return await fs.readFile(localPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }
  const client = getR2Client();
  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: env.r2Bucket,
        Key: key
      })
    );

    return await streamToBuffer(response.Body);
  } catch (error) {
    if (isNotFoundError(error)) {
      return null;
    }
    throw error;
  }
};

export const deleteDocumentObject = async (key: string) => {
  if (!isR2Available()) {
    const localPath = path.join(localStorageRoot, key);
    try {
      await fs.unlink(localPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
    return;
  }
  const client = getR2Client();
  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: env.r2Bucket,
        Key: key
      })
    );
  } catch (error) {
    if (isNotFoundError(error)) {
      return;
    }
    throw error;
  }
};

export const deleteConveneteLogoObject = async (key: string) => {
  if (!isR2Available()) {
    const localPath = path.join(localStorageRoot, key);
    try {
      await fs.unlink(localPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
    return;
  }
  const client = getR2Client();
  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: env.r2Bucket,
        Key: key
      })
    );
  } catch (error) {
    if (isNotFoundError(error)) {
      return;
    }
    throw error;
  }
};

export const createConveneteTimbreObjectKey = (conveneteId: number, mimeType?: string) => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const extension = mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ? "docx" : "docx";
  return `proponentes/timbres/${year}/${month}/${conveneteId}-timbre-${Date.now()}.${extension}`;
};

export const putConveneteTimbreObject = async (params: {
  key: string;
  buffer: Buffer;
  contentType?: string;
}) => {
  if (!isR2Available()) {
    await ensureLocalStorageDir();
    const localPath = path.join(localStorageRoot, params.key);
    await fs.mkdir(path.dirname(localPath), { recursive: true });
    await fs.writeFile(localPath, params.buffer);
    return params.key;
  }
  const client = getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: env.r2Bucket,
      Key: params.key,
      Body: params.buffer,
      ContentType: params.contentType ?? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    })
  );
  return params.key;
};

export const getConveneteTimbreObjectBuffer = async (key: string) => {
  if (!isR2Available()) {
    const localPath = path.join(localStorageRoot, key);
    return fs.readFile(localPath);
  }
  const client = getR2Client();
  const response = await client.send(
    new GetObjectCommand({
      Bucket: env.r2Bucket,
      Key: key
    })
  );
  const stream = response.Body as Readable;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

export const deleteConveneteTimbreObject = async (key: string) => {
  if (!isR2Available()) {
    const localPath = path.join(localStorageRoot, key);
    try {
      await fs.unlink(localPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
    return;
  }
  const client = getR2Client();
  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: env.r2Bucket,
        Key: key
      })
    );
  } catch (error) {
    if (isNotFoundError(error)) {
      return;
    }
    throw error;
  }
};

export const documentObjectExists = async (key: string) => {
  if (!isR2Available()) {
    const localPath = path.join(localStorageRoot, key);
    try {
      await fs.access(localPath);
      return true;
    } catch {
      return false;
    }
  }
  const client = getR2Client();
  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: env.r2Bucket,
        Key: key
      })
    );
    return true;
  } catch (error) {
    if (isNotFoundError(error)) {
      return false;
    }
    throw error;
  }
};
