"use strict";
const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const root = path.resolve(__dirname, "..");

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    console.log("npm run db:sql -- [database/consultas.sql] [--write]");
    console.log("Una instrucción SQL por archivo. Sin --write se abre en modo de solo lectura.");
    return;
  }
  if (args.some(a => a.startsWith("--") && a !== "--write") || args.filter(a => !a.startsWith("--")).length > 1) throw new Error("Argumentos inválidos. Usa --help.");
  const write = args.includes("--write");
  const input = path.resolve(root, args.find(a => !a.startsWith("--")) || "database/consultas.sql");
  if (path.extname(input).toLowerCase() !== ".sql") throw new Error("El archivo debe tener extensión .sql.");
  const sql = fs.readFileSync(input, "utf8").replace(/^\uFEFF/, "");
  const dbPath = path.resolve(root, process.env.NEXORA_DB_PATH || "data/nexora.sqlite");
  const db = new Database(dbPath, { readonly: !write, fileMustExist: true });
  try {
    db.pragma("foreign_keys = ON");
    db.pragma("busy_timeout = 5000");
    const statement = db.prepare(sql);
    console.log(`Base de datos: ${dbPath}`);
    console.log(`Archivo SQL: ${input}`);
    if (!statement.readonly && !write) throw new Error("La consulta modifica datos. Revisa el SQL y añade --write para aplicarlo con respaldo.");
    if (!statement.readonly) {
      const backupDir = path.join(path.dirname(dbPath), "respaldos-sql");
      fs.mkdirSync(backupDir, { recursive: true });
      const backupPath = path.join(backupDir, `${path.basename(dbPath)}-${new Date().toISOString().replace(/[:.]/g,"-")}.sqlite`);
      await db.backup(backupPath);
      console.log(`Respaldo anterior al cambio: ${backupPath}`);
    }
    const result = db.transaction(() => statement.reader ? statement.all() : statement.run())();
    if (statement.reader) console.table(result);
    else console.log(`Cambio aplicado. Filas afectadas: ${result.changes}`);
  } finally { db.close(); }
}
main().catch(error => { console.error(`SQL no aplicado: ${error.message}`); process.exitCode = 1; });
