"use strict";
const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const root = path.resolve(__dirname, "..");
async function backup() {
  const dbPath = path.resolve(root, process.env.NEXORA_DB_PATH || "data/nexora.sqlite");
  if (!fs.existsSync(dbPath)) throw new Error("Inicia Nexora una vez antes de crear un respaldo.");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const destination = path.join(root, "respaldos", stamp);
  fs.mkdirSync(path.join(destination,"data"), { recursive: true });
  const db = new Database(dbPath, { readonly: true });
  try { await db.backup(path.join(destination, "data/nexora.sqlite")); } finally { db.close(); }
  for (const folder of ["assets","uploads"]) fs.cpSync(path.join(root, folder), path.join(destination, folder), { recursive: true });
  fs.writeFileSync(path.join(destination,"LEEME.txt"), "Respaldo de SQLite e imágenes de Nexora Autos. Para restaurar, detén todos los servidores antes de reemplazar la base y las carpetas. Conserva una copia del estado actual.\n");
  console.log(`Respaldo creado en ${destination}`);
}
backup().catch(error => { console.error(error.message); process.exitCode = 1; });
