import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { hasDatabase, query } from "@/lib/server/db";

const dataDir = path.join(process.cwd(), ".data");
const dataFile = path.join(dataDir, "users.json");

async function readLocalUsers() {
  try { return JSON.parse(await fs.readFile(dataFile, "utf8")); }
  catch (error) { if (error.code === "ENOENT") return []; throw error; }
}

async function writeLocalUsers(users) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(dataFile, JSON.stringify(users, null, 2), { encoding: "utf8", mode: 0o600 });
}

export async function findUserByEmail(email) {
  const normalized = email.trim().toLowerCase();
  if (hasDatabase()) {
    const result = await query("SELECT id, name, email, password_hash, role, status, is_demo FROM users WHERE email = $1 LIMIT 1", [normalized]);
    return result.rows[0] || null;
  }
  if (process.env.NODE_ENV === "production") throw new Error("Database is required for account access");
  return (await readLocalUsers()).find((user) => user.email === normalized) || null;
}

export async function findUserById(id) {
  if (hasDatabase()) {
    const result = await query("SELECT id, name, email, role, status, is_demo, created_at FROM users WHERE id = $1 LIMIT 1", [id]);
    return result.rows[0] || null;
  }
  if (process.env.NODE_ENV === "production") throw new Error("Database is required for account access");
  return (await readLocalUsers()).find((user) => user.id === id) || null;
}

export async function createUser({ name, email, passwordHash }) {
  const normalized = email.trim().toLowerCase();
  if (hasDatabase()) {
    const result = await query("INSERT INTO users (name, email, password_hash, role, status) VALUES ($1, $2, $3, 'member', 'active') RETURNING id, name, email, role, status", [name.trim(), normalized, passwordHash]);
    return result.rows[0];
  }
  if (process.env.NODE_ENV === "production") throw new Error("Database is required for account creation");
  const users = await readLocalUsers();
  if (users.some((user) => user.email === normalized)) { const error = new Error("EMAIL_EXISTS"); error.code = "EMAIL_EXISTS"; throw error; }
  const user = { id: crypto.randomUUID(), name: name.trim(), email: normalized, password_hash: passwordHash, role: "member", status: "active", created_at: new Date().toISOString() };
  await writeLocalUsers([...users, user]);
  return user;
}
