import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { isLocalRuntime } from "@/lib/server/demo-environment";

const localRoot = path.join(process.cwd(), ".data", "private-media");

export async function putPrivateObject({ key, body, contentType }) {
  assertStorageKey(key);
  if (!hasRemoteStorage()) {
    if (process.env.NODE_ENV === "production" && !isLocalRuntime()) throw new Error("Private object storage is not configured");
    const target = localPath(key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, body, { mode: 0o600 });
    return { provider: "local", key };
  }
  const response = await signedStorageRequest({ method: "PUT", key, body, contentType });
  if (!response.ok) throw new Error(`Object storage rejected upload (${response.status})`);
  return { provider: "s3", key };
}

export async function getPrivateObject(key) {
  assertStorageKey(key);
  if (!hasRemoteStorage()) {
    if (process.env.NODE_ENV === "production" && !isLocalRuntime()) throw new Error("Private object storage is not configured");
    return fs.readFile(localPath(key));
  }
  const response = await signedStorageRequest({ method: "GET", key });
  if (!response.ok) {
    const error = new Error(response.status === 404 ? "Object not found" : `Object storage read failed (${response.status})`);
    error.code = response.status === 404 ? "NOT_FOUND" : "STORAGE_READ_FAILED";
    throw error;
  }
  return Buffer.from(await response.arrayBuffer());
}

export async function deletePrivateObject(key) {
  assertStorageKey(key);
  if (!hasRemoteStorage()) {
    if (process.env.NODE_ENV === "production" && !isLocalRuntime()) throw new Error("Private object storage is not configured");
    await fs.rm(localPath(key), { force: true });
    return;
  }
  const response = await signedStorageRequest({ method: "DELETE", key });
  if (!response.ok && response.status !== 404) throw new Error(`Object storage delete failed (${response.status})`);
}

export function hasRemoteStorage() {
  return Boolean(process.env.NESTORA_STORAGE_BUCKET && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
}

async function signedStorageRequest({ method, key, body = Buffer.alloc(0), contentType }) {
  const region = process.env.AWS_REGION || "eu-west-1";
  const bucket = process.env.NESTORA_STORAGE_BUCKET;
  const endpoint = process.env.NESTORA_STORAGE_ENDPOINT?.replace(/\/$/, "");
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  const url = endpoint
    ? new URL(`${endpoint}/${encodeURIComponent(bucket)}/${encodedKey}`)
    : new URL(`https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`);
  const payload = Buffer.isBuffer(body) ? body : Buffer.from(body);
  const payloadHash = sha256(payload);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const headers = {
    host: url.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  if (contentType) headers["content-type"] = contentType;
  if (process.env.AWS_SESSION_TOKEN) headers["x-amz-security-token"] = process.env.AWS_SESSION_TOKEN;
  const signedHeaderNames = Object.keys(headers).sort();
  const canonicalHeaders = signedHeaderNames.map((name) => `${name}:${headers[name].trim()}\n`).join("");
  const canonicalRequest = [method, url.pathname, "", canonicalHeaders, signedHeaderNames.join(";"), payloadHash].join("\n");
  const scope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonicalRequest)].join("\n");
  const signingKey = signatureKey(process.env.AWS_SECRET_ACCESS_KEY, dateStamp, region, "s3");
  const signature = hmac(signingKey, stringToSign, "hex");
  headers.authorization = `AWS4-HMAC-SHA256 Credential=${process.env.AWS_ACCESS_KEY_ID}/${scope}, SignedHeaders=${signedHeaderNames.join(";")}, Signature=${signature}`;
  return fetch(url, { method, headers, body: method === "GET" || method === "DELETE" ? undefined : payload, signal: AbortSignal.timeout(30_000) });
}

function signatureKey(secret, dateStamp, region, service) {
  const date = hmac(`AWS4${secret}`, dateStamp);
  const regionKey = hmac(date, region);
  const serviceKey = hmac(regionKey, service);
  return hmac(serviceKey, "aws4_request");
}

function hmac(key, value, encoding) {
  return crypto.createHmac("sha256", key).update(value, "utf8").digest(encoding);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function assertStorageKey(key) {
  if (typeof key !== "string" || !key || key.includes("..") || key.includes("\\") || path.isAbsolute(key)) throw new Error("Invalid object storage key");
}

function localPath(key) {
  const target = path.resolve(localRoot, key);
  if (!target.startsWith(`${path.resolve(localRoot)}${path.sep}`)) throw new Error("Invalid local object path");
  return target;
}
