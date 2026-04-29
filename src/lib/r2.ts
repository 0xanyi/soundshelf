import { randomUUID } from "node:crypto";
import { extname, parse } from "node:path";

import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type R2Env = {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
};

type PutAudioObjectInput = {
  key: string;
  body: PutObjectCommandInput["Body"];
  contentType: string;
};

let cachedClient: S3Client | null = null;
let cachedEndpoint: string | null = null;

export function r2Client(): S3Client {
  const env = getR2Env();

  if (cachedClient && cachedEndpoint === env.endpoint) {
    return cachedClient;
  }

  cachedClient = new S3Client({
    region: "auto",
    endpoint: env.endpoint,
    credentials: {
      accessKeyId: env.accessKeyId,
      secretAccessKey: env.secretAccessKey,
    },
    forcePathStyle: true,
  });
  cachedEndpoint = env.endpoint;

  return cachedClient;
}

export async function putAudioObject({
  key,
  body,
  contentType,
}: PutAudioObjectInput): Promise<void> {
  const env = getR2Env();

  await r2Client().send(
    new PutObjectCommand({
      Bucket: env.bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function getSignedAudioUrl(key: string): Promise<string> {
  const env = getR2Env();

  return getSignedUrl(
    r2Client(),
    new GetObjectCommand({
      Bucket: env.bucketName,
      Key: key,
    }),
    { expiresIn: 60 * 60 },
  );
}

export function buildTuneObjectKey(fileName: string): string {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const parsedName = parse(fileName);
  const safeBaseName = slugify(parsedName.name) || "audio";
  const safeExtension = sanitizeExtension(extname(fileName));

  return `audio/tunes/${year}/${month}/${safeBaseName}-${randomUUID()}${safeExtension}`;
}

function getR2Env(): R2Env {
  const endpoint = requireEnv("R2_ENDPOINT");
  const accessKeyId = requireEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = requireEnv("R2_SECRET_ACCESS_KEY");
  const bucketName = requireEnv("R2_BUCKET_NAME");

  return { endpoint, accessKeyId, secretAccessKey, bucketName };
}

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required R2 environment variable: ${name}`);
  }

  return value;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function sanitizeExtension(extension: string): string {
  const safeExtension = extension.toLowerCase().replace(/[^a-z0-9.]/g, "");

  if (!safeExtension || safeExtension === ".") {
    return "";
  }

  return safeExtension.startsWith(".") ? safeExtension : `.${safeExtension}`;
}
