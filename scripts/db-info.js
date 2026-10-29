"use strict";
const path = require("path");
const Database = require("better-sqlite3");
const root = path.resolve(__dirname, "..");
const dbPath = path.resolve(root, process.env.NEXORA_DB_PATH || "data/nexora.sqlite");
let db;
try {
  db = new Database(dbPath, { readonly: true, fileMustExist: true });
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
  console.log(`Base de datos: ${dbPath}`);
  console.log(`Integridad: ${db.pragma("integrity_check", { simple: true })}`);
  console.table(tables.map(({ name }) => ({ tabla: name, registros: db.prepare(`SELECT COUNT(*) AS n FROM "${name.replace(/"/g, '""')}"`).get().n })));
  console.log("Solo consulta. Para ver vehículos: npm run db:sql");
} catch (error) {
  console.error(`No se pudo consultar SQLite: ${error.message}`);
  console.error("Comprueba NEXORA_DB_PATH en .env. Una instalación nueva crea la base al ejecutar npm start.");
  process.exitCode = 1;
} finally {
  db?.close();
}
