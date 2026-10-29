"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const Database = require("better-sqlite3");
const root = path.resolve(__dirname, "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "nexora-db-tools-"));
const dbPath = path.join(temp, "fixture.sqlite");
const db = new Database(dbPath);
db.exec("CREATE TABLE categories(id INTEGER PRIMARY KEY); CREATE TABLE products(id INTEGER PRIMARY KEY, category_id INTEGER REFERENCES categories(id), name TEXT); INSERT INTO categories VALUES (1); INSERT INTO products VALUES (1, 1, 'Antes');");
db.close();
const run = (script, args = []) => spawnSync(process.execPath,[path.join(root,script),...args],{ cwd:root,env:{...process.env,NEXORA_DB_PATH:dbPath},encoding:"utf8" });
const sql = (name, text) => { const file=path.join(temp,name+".sql");fs.writeFileSync(file,text);return file; };
const read = () => { const d=new Database(dbPath,{readonly:true});try{return d.prepare("SELECT * FROM products WHERE id = 1").get();}finally{d.close();} };
let count = 0;
const check = (label,fn) => { fn();count++;console.log("OK "+label); };

check("Info consulta la base elegida sin cambiarla",()=>{
  const r=run("scripts/db-info.js");assert.equal(r.status,0,r.stderr);assert.ok(r.stdout.includes(dbPath)&&r.stdout.includes("products"));assert.equal(read().name,"Antes");
});
check("SQL lee el archivo y la base elegidos",()=>{
  const r=run("scripts/db-sql.js",[sql("consulta","SELECT name FROM products;")]);assert.equal(r.status,0,r.stderr);assert.ok(r.stdout.includes("Antes"));
});
const update = sql("actualizar","UPDATE products SET name = 'Después' WHERE id = 1;");
check("La escritura sin --write se rechaza sin alterar los datos",()=>{
  const r=run("scripts/db-sql.js",[update]);assert.notEqual(r.status,0);assert.equal(read().name,"Antes");
});
check("La escritura explícita guarda respaldo y aplica el cambio",()=>{
  const r=run("scripts/db-sql.js",[update,"--write"]);assert.equal(r.status,0,r.stderr);assert.equal(read().name,"Después");
  const files=fs.readdirSync(path.join(temp,"respaldos-sql"));assert.equal(files.length,1);
  const backup=new Database(path.join(temp,"respaldos-sql",files[0]),{readonly:true});assert.equal(backup.prepare("SELECT name FROM products WHERE id = 1").get().name,"Antes");backup.close();
});
check("Respeta claves foráneas y conserva los datos al fallar",()=>{
  const r=run("scripts/db-sql.js",[sql("invalido","UPDATE products SET category_id = 99 WHERE id = 1;"),"--write"]);assert.notEqual(r.status,0);assert.equal(read().category_id,1);
});
check("Rechaza archivos con varias instrucciones antes de aplicar cambios",()=>{
  const r=run("scripts/db-sql.js",[sql("multiple","UPDATE products SET name = 'No aplicar'; DELETE FROM products;"),"--write"]);assert.notEqual(r.status,0);assert.equal(read().name,"Después");
});
check("UPDATE RETURNING también respalda y devuelve el resultado",()=>{
  const r=run("scripts/db-sql.js",[sql("returning","UPDATE products SET name = 'Final' WHERE id = 1 RETURNING name;"),"--write"]);assert.equal(r.status,0,r.stderr);assert.ok(r.stdout.includes("Final"));assert.equal(read().name,"Final");
});
console.log(`\n${count} comprobaciones correctas. Solo se usó una base temporal en ${temp}.`);
