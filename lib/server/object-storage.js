import fs from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { isLocalRuntime } from "@/lib/server/demo-environment";

const localRoot = path.join(process.cwd(), ".data", "private-media");
let remoteClient;
let remoteClientKey;

export async function putPrivateObject({ key, body, contentType }) {
  assertStorageKey(key);
  if (!hasRemoteStorage()) {
    if (process.env.NODE_ENV === "production" && !isLocalRuntime()) throw new Error("Private object storage is not configured");
    const target = localPath(key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, body, { mode: 0o600 });
    return { provider: "local", key };
  }
  try {
    await getRemoteClient().send(new PutObjectCommand({
      Bucket: process.env.NESTORA_STORAGE_BUCKET,
      Key: key,
      Body: Buffer.isBuffer(body) ? body : Buffer.from(body),
      ContentType: contentType,
      ServerSideEncryption: "AES256",
    }));
  } catch {
    throw new Error("Object storage rejected upload");
  }
  return { provider: "s3", key };
}

export async function getPrivateObject(key) {
  assertStorageKey(key);
  if (!hasRemoteStorage()) {
    if (process.env.NODE_ENV === "production" && !isLocalRuntime()) throw new Error("Private object storage is not configured");
    return fs.readFile(localPath(key));
  }
  try {
    const response = await getRemoteClient().send(new GetObjectCommand({
      Bucket: process.env.NESTORA_STORAGE_BUCKET,
      Key: key,
    }));
    return streamToBuffer(response.Body);
  } catch (cause) {
    const missing = cause?.name === "NoSuchKey" || cause?.$metadata?.httpStatusCode === 404;
    const error = new Error(missing ? "Object not found" : "Object storage read failed");
    error.code = missing ? "NOT_FOUND" : "STORAGE_READ_FAILED";
    throw error;
  }
}

export async function deletePrivateObject(key) {
  assertStorageKey(key);
  if (!hasRemoteStorage()) {
    if (process.env.NODE_ENV === "production" && !isLocalRuntime()) throw new Error("Private object storage is not configured");
    await fs.rm(localPath(key), { force: true });
    return;
  }
  try {
    await getRemoteClient().send(new DeleteObjectCommand({
      Bucket: process.env.NESTORA_STORAGE_BUCKET,
      Key: key,
    }));
  } catch (cause) {
    if (cause?.name !== "NoSuchKey" && cause?.$metadata?.httpStatusCode !== 404) {
      throw new Error("Object storage delete failed");
    }
  }
}

export function hasRemoteStorage() {
  return Boolean(process.env.NESTORA_STORAGE_BUCKET);
}

function getRemoteClient() {
  const region = process.env.AWS_REGION || "eu-west-1";
  const endpoint = process.env.NESTORA_STORAGE_ENDPOINT?.replace(/\/$/, "");
  const clientKey = `${region}|${endpoint || "aws"}`;
  if (!remoteClient || remoteClientKey !== clientKey) {
    remoteClient = new S3Client({
      region,
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    });
    remoteClientKey = clientKey;
  }
  return remoteClient;
}

async function streamToBuffer(body) {
  if (!body) return Buffer.alloc(0);
  if (typeof body.transformToByteArray === "function") {
    return Buffer.from(await body.transformToByteArray());
  }
  const chunks = [];
  for await (const chunk of body) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function assertStorageKey(key) {
  if (typeof key !== "string" || !key || key.includes("..") || key.includes("\\") || path.isAbsolute(key)) throw new Error("Invalid object storage key");
}

function localPath(key) {
  const target = path.resolve(localRoot, key);
  if (!target.startsWith(`${path.resolve(localRoot)}${path.sep}`)) throw new Error("Invalid local object path");
  return target;
}
