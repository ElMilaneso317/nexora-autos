"use strict";
const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const root = path.resolve(__dirname, "..");
const db = new Database(path.resolve(root, process.env.NEXORA_DB_PATH || "data/nexora.sqlite"), { readonly: true, fileMustExist: true });
const schema = db.prepare("SELECT sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY type DESC,name").all();
fs.writeFileSync(path.join(root,"documentacion/esquema.sql"), schema.map(x => x.sql+";").join("\n\n")+"\n");
db.close();
