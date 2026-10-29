"use strict";

// Migración aditiva: conserva inventario, usuarios y solicitudes existentes.
module.exports = function upgrade(db, bcrypt) {
  db.transaction(() => {
    const add = (table, column, definition) => {
      if (!db.prepare(`PRAGMA table_info(${table})`).all().some(x => x.name === column)) {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
        return true;
      }
      return false;
    };
    add("users", "activo", "INTEGER NOT NULL DEFAULT 1");
    const first = add("vehicles", "destacado", "INTEGER NOT NULL DEFAULT 0");
    add("vehicles", "precio_anterior", "INTEGER");
    add("vehicles", "oferta", "TEXT NOT NULL DEFAULT ''");
    add("quotes", "user_id", "INTEGER REFERENCES users(id)");
    add("test_drives", "user_id", "INTEGER REFERENCES users(id)");
    db.exec(`CREATE TABLE IF NOT EXISTS vehicle_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
      ruta TEXT NOT NULL, etiqueta TEXT NOT NULL DEFAULT 'Vista del vehículo',
      posicion INTEGER NOT NULL DEFAULT 0,
      UNIQUE(vehicle_id, ruta)
    );
    CREATE TABLE IF NOT EXISTS favorites (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
      PRIMARY KEY(user_id, vehicle_id)
    );
    CREATE INDEX IF NOT EXISTS idx_quotes_user ON quotes(user_id);
    CREATE INDEX IF NOT EXISTS idx_test_drives_user ON test_drives(user_id);`);
    db.exec(`CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL, body TEXT NOT NULL,
      request_type TEXT CHECK(request_type IN ('quotes', 'test-drives')),
      request_id INTEGER,
      read_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, id);
    CREATE TABLE IF NOT EXISTS request_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quote_id INTEGER REFERENCES quotes(id) ON DELETE CASCADE,
      test_drive_id INTEGER REFERENCES test_drives(id) ON DELETE CASCADE,
      sender_id INTEGER NOT NULL REFERENCES users(id),
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CHECK ((quote_id IS NOT NULL) + (test_drive_id IS NOT NULL) = 1)
    );
    CREATE INDEX IF NOT EXISTS idx_messages_quote ON request_messages(quote_id, id);
    CREATE INDEX IF NOT EXISTS idx_messages_drive ON request_messages(test_drive_id, id);`);
    const insertUser = db.prepare("INSERT OR IGNORE INTO users(username, password_hash, nombre, role) VALUES (?, ?, ?, ?)");
    for (const [username, password, nombre, role] of [
      ["asesor1", "Asesor123!", "Sofía Martínez", "empleado"],
      ["asesor2", "Asesor456!", "Diego Ramírez", "empleado"]
    ]) {
      if (!db.prepare("SELECT id FROM users WHERE username = ?").get(username)) insertUser.run(username, bcrypt.hashSync(password, 12), nombre, role);
    }
    // Retira exclusivamente la cuenta compartida de ejemplo intacta. Conserva sus datos.
    const demo = db.prepare("SELECT * FROM users WHERE username = 'cliente' AND nombre = 'Cliente de demostración' AND role = 'cliente' AND activo = 1").get();
    if (demo && bcrypt.compareSync("Cliente123!", demo.password_hash)) db.prepare("UPDATE users SET activo = 0 WHERE id = ?").run(demo.id);
    if (first) {
      db.prepare("UPDATE vehicles SET destacado = 1 WHERE imagen IN (?, ?)").run("assets/bmw-m440i.png", "assets/toyota-gr86.png");
      db.prepare("UPDATE vehicles SET precio_anterior = 859900, oferta = 'Selección especial' WHERE imagen = ? AND precio = 825900").run("assets/toyota-gr86.png");
    }
    const insertImage = db.prepare("INSERT OR IGNORE INTO vehicle_images(vehicle_id, ruta, etiqueta, posicion) VALUES (?, ?, ?, ?)");
    for (const v of db.prepare("SELECT id, imagen FROM vehicles").all()) {
      if (db.prepare("SELECT id FROM vehicle_images WHERE vehicle_id = ?").get(v.id)) continue;
      insertImage.run(v.id, v.imagen, "Vista original del catálogo", 0);
      const slug = v.imagen.match(/^assets\/(.+)\.png$/)?.[1];
      if (slug) insertImage.run(v.id, `assets/${slug}-frontal.png`, "Vista frontal ilustrativa", 1);
      else if (v.imagen === "uploads/1788546869103-de1093210784.jpg") insertImage.run(v.id, "assets/corvette-trasera.png", "Vista trasera ilustrativa", 1);
    }
  })();
};
