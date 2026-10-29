"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const express = require("express");
const session = require("express-session");
const multer = require("multer");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const DB_PATH = process.env.NEXORA_DB_PATH || path.join(DATA_DIR, "nexora.sqlite");
const UPLOAD_DIR = path.join(ROOT, "uploads");
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(48).toString("hex");

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const seedVehicles = [
  {
    id: 1,
    marca: "BMW",
    modelo: "M440i Coupé",
    año: 2024,
    precio: 1349900,
    kilometraje: 12400,
    carrocería: "Coupé",
    transmisión: "Automático",
    motor: "3.0 L Turbo",
    color: "Blanco mineral",
    condición: "Seminuevo",
    imagen: "assets/bmw-m440i.png",
    descripción: "Coupé premium con desempeño deportivo, cabina refinada y tecnología avanzada.",
    disponibilidad: "Activo",
    glow: "rgba(78, 142, 189, .25)"
  },
  {
    id: 2,
    marca: "Toyota",
    modelo: "GR86",
    año: 2025,
    precio: 825900,
    kilometraje: 0,
    carrocería: "Coupé",
    transmisión: "Manual",
    motor: "2.4 L Boxer",
    color: "Azul zafiro",
    condición: "Nuevo",
    imagen: "assets/toyota-gr86.png",
    descripción: "Deportivo ligero de tracción trasera con manejo preciso y estilo agresivo.",
    disponibilidad: "Activo",
    glow: "rgba(53, 105, 218, .3)"
  },
  {
    id: 3,
    marca: "Nissan",
    modelo: "Z Performance",
    año: 2024,
    precio: 1198000,
    kilometraje: 6800,
    carrocería: "Coupé",
    transmisión: "Automático",
    motor: "3.0 L Twin Turbo",
    color: "Blanco perlado",
    condición: "Seminuevo",
    imagen: "assets/nissan-z.png",
    descripción: "Gran turismo japonés con motor twin turbo, respuesta contundente y presencia clásica.",
    disponibilidad: "Activo",
    glow: "rgba(193, 137, 53, .24)"
  },
  {
    id: 4,
    marca: "Audi",
    modelo: "Q5 S line",
    año: 2023,
    precio: 859900,
    kilometraje: 18200,
    carrocería: "SUV",
    transmisión: "Automático",
    motor: "2.0 L TFSI",
    color: "Azul navarra",
    condición: "Seminuevo",
    imagen: "assets/audi-q5.png",
    descripción: "SUV premium equilibrada para ciudad y carretera, con paquete S line y gran confort.",
    disponibilidad: "Activo",
    glow: "rgba(35, 143, 177, .28)"
  },
  {
    id: 5,
    marca: "Ford",
    modelo: "Mustang GT",
    año: 2024,
    precio: 1245000,
    kilometraje: 4100,
    carrocería: "Coupé",
    transmisión: "Automático",
    motor: "5.0 L V8",
    color: "Rojo carrera",
    condición: "Seminuevo",
    imagen: "assets/ford-mustang.png",
    descripción: "Muscle car V8 con sonido contundente, gran potencia y equipamiento moderno.",
    disponibilidad: "Activo",
    glow: "rgba(207, 47, 38, .29)"
  },
  {
    id: 6,
    marca: "Mazda",
    modelo: "MX-5 RF",
    año: 2024,
    precio: 699900,
    kilometraje: 7500,
    carrocería: "Convertible",
    transmisión: "Manual",
    motor: "2.0 L Skyactiv",
    color: "Rojo brillante",
    condición: "Seminuevo",
    imagen: "assets/mazda-mx5.png",
    descripción: "Roadster compacto con techo rígido retráctil, bajo peso y sensación de manejo directa.",
    disponibilidad: "Activo",
    glow: "rgba(191, 39, 45, .3)"
  }
];

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      nombre TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      fecha_registro TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      marca TEXT NOT NULL,
      modelo TEXT NOT NULL,
      "año" INTEGER NOT NULL,
      precio INTEGER NOT NULL,
      kilometraje INTEGER NOT NULL,
      "carrocería" TEXT NOT NULL,
      "transmisión" TEXT NOT NULL,
      motor TEXT NOT NULL,
      color TEXT NOT NULL,
      "condición" TEXT NOT NULL,
      imagen TEXT NOT NULL,
      "descripción" TEXT NOT NULL,
      disponibilidad TEXT NOT NULL DEFAULT 'Activo',
      fecha_registro TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      glow TEXT NOT NULL DEFAULT 'rgba(255, 79, 46, .24)'
    );

    CREATE TABLE IF NOT EXISTS quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      nombre TEXT NOT NULL,
      telefono TEXT NOT NULL,
      correo TEXT NOT NULL,
      enganche INTEGER NOT NULL,
      plazo INTEGER NOT NULL,
      estado TEXT NOT NULL DEFAULT 'Nueva',
      fecha_registro TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS test_drives (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      nombre TEXT NOT NULL,
      telefono TEXT NOT NULL,
      correo TEXT NOT NULL,
      fecha TEXT NOT NULL,
      hora TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'Pendiente',
      fecha_registro TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS idx_vehicles_disponibilidad ON vehicles(disponibilidad);
    CREATE INDEX IF NOT EXISTS idx_quotes_estado ON quotes(estado);
    CREATE INDEX IF NOT EXISTS idx_test_drives_estado ON test_drives(estado);
  `);

  const userCount = db.prepare("SELECT COUNT(*) AS count FROM users").get().count;
  if (userCount === 0) {
    db.prepare("INSERT INTO users (username, password_hash, nombre) VALUES (?, ?, ?)").run(
      "admin",
      bcrypt.hashSync("Admin123!", 12),
      "Administrador Nexora"
    );
  }

  const vehicleCount = db.prepare("SELECT COUNT(*) AS count FROM vehicles").get().count;
  if (vehicleCount === 0) {
    const insert = db.prepare(`
      INSERT INTO vehicles (
        id, marca, modelo, "año", precio, kilometraje, "carrocería", "transmisión",
        motor, color, "condición", imagen, "descripción", disponibilidad, glow
      ) VALUES (
        @id, @marca, @modelo, @año, @precio, @kilometraje, @carrocería, @transmisión,
        @motor, @color, @condición, @imagen, @descripción, @disponibilidad, @glow
      )
    `);
    const seed = db.transaction((vehicles) => vehicles.forEach((vehicle) => insert.run(vehicle)));
    seed(seedVehicles);
  }

  db.exec("PRAGMA optimize;");
}

initDatabase();
require("./database-upgrade")(db, bcrypt);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, UPLOAD_DIR),
  filename: (_req, file, callback) => {
    const ext = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" }[file.mimetype] || ".invalid";
    callback(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowed.has(file.mimetype)) return callback(new Error("Solo se permiten imagenes JPG, PNG o WebP."));
    callback(null, true);
  }
});

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
require("./session-auth")({ app, db, session, secret: SESSION_SECRET });
app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && req.headers.origin) {
    try {
      if (new URL(req.headers.origin).host !== req.headers.host) return res.status(403).json({ error: "Origen no permitido." });
    } catch { return res.status(403).json({ error: "Origen inválido." }); }
  }
  next();
});

app.use("/assets", express.static(path.join(ROOT, "assets")));
app.use("/uploads", express.static(UPLOAD_DIR));

function mapVehicle(row) {
  return {
    id: row.id,
    marca: row.marca,
    modelo: row.modelo,
    año: row["año"],
    precio: row.precio,
    kilometraje: row.kilometraje,
    carrocería: row["carrocería"],
    transmisión: row["transmisión"],
    motor: row.motor,
    color: row.color,
    condición: row["condición"],
    imagen: row.imagen,
    descripción: row["descripción"],
    disponibilidad: row.disponibilidad,
    fecha_registro: row.fecha_registro,
    glow: row.glow,
    destacado: Boolean(row.destacado),
    precio_anterior: row.precio_anterior,
    oferta: row.oferta,
    imagenes: db.prepare("SELECT id, ruta, etiqueta FROM vehicle_images WHERE vehicle_id = ? ORDER BY posicion, id").all(row.id)
  };
}

function cleanText(value, max = 120) {
  return String(value || "").trim().slice(0, max);
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function isPhone(value) {
  return /^[0-9+\-\s()]{8,20}$/.test(String(value || "").trim());
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Sesión requerida." });
  if (req.user.role !== "admin") return res.status(403).json({ error: "Solo el administrador puede realizar esta acción." });
  next();
}

function requireStaff(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Sesión requerida." });
  if (!["admin", "empleado"].includes(req.user.role)) return res.status(403).json({ error: "Acceso exclusivo del equipo Nexora." });
  next();
}

const { notify, requireUser } = require("./customer-messaging")({ app, db, requireStaff });
require("./account-routes")({ app, db, bcrypt, requireAdmin, requireStaff, cleanText, notify });

function validateVehiclePayload(body, imagePath, currentImage) {
  const get = (...keys) => {
    for (const key of keys) {
      if (body[key] !== undefined) return body[key];
    }
    return "";
  };
  const vehicle = {
    marca: cleanText(get("marca"), 60),
    modelo: cleanText(get("modelo"), 80),
    año: Number(get("año", "anio")),
    precio: Number(get("precio")),
    kilometraje: Number(get("kilometraje")),
    carrocería: cleanText(get("carrocería", "carroceria"), 40),
    transmisión: cleanText(get("transmisión", "transmision"), 40),
    motor: cleanText(get("motor"), 80),
    color: cleanText(get("color"), 60),
    condición: cleanText(get("condición", "condicion"), 30),
    imagen: imagePath || cleanText(get("imagen"), 180) || currentImage || "",
    descripción: cleanText(get("descripción", "descripcion"), 800),
    disponibilidad: cleanText(get("disponibilidad"), 30) || "Activo",
    glow: cleanText(get("glow"), 80) || "rgba(255, 79, 46, .24)"
  };

  const errors = [];
  if (!vehicle.marca) errors.push("Marca requerida.");
  if (!vehicle.modelo) errors.push("Modelo requerido.");
  if (!Number.isInteger(vehicle.año) || vehicle.año < 1990 || vehicle.año > 2035) errors.push("Año invalido.");
  if (!Number.isInteger(vehicle.precio) || vehicle.precio <= 0) errors.push("Precio invalido.");
  if (!Number.isInteger(vehicle.kilometraje) || vehicle.kilometraje < 0) errors.push("Kilometraje invalido.");
  if (!vehicle.carrocería) errors.push("Carroceria requerida.");
  if (!vehicle.transmisión) errors.push("Transmision requerida.");
  if (!vehicle.motor) errors.push("Motor requerido.");
  if (!vehicle.color) errors.push("Color requerido.");
  if (!["Nuevo", "Seminuevo", "Usado"].includes(vehicle.condición)) errors.push("Condicion invalida.");
  if (!vehicle.imagen) errors.push("Imagen requerida.");
  if (!vehicle.descripción) errors.push("Descripcion requerida.");
  if (!["Activo", "Inactivo", "Vendido"].includes(vehicle.disponibilidad)) errors.push("Disponibilidad invalida.");

  return { vehicle, errors };
}

function uploadedImagePath(file) {
  return file ? `uploads/${file.filename}` : "";
}

const gallery = require("./gallery")(db, ROOT);
const receiveImages = upload.fields([{ name: "imagen_archivo", maxCount: 1 }, { name: "imagenes_archivos", maxCount: 9 }]);
function galleryUpload(req, res, next) {
  receiveImages(req, res, error => {
    if (error) return next(error);
    for (const file of Object.values(req.files || {}).flat()) {
      const header = Buffer.alloc(12);
      const fd = fs.openSync(file.path, "r");
      fs.readSync(fd, header, 0, 12, 0);
      fs.closeSync(fd);
      const valid = file.mimetype === "image/png" ? header.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
        : file.mimetype === "image/jpeg" ? header[0] === 255 && header[1] === 216 && header[2] === 255
        : header.subarray(0,4).toString() === "RIFF" && header.subarray(8,12).toString() === "WEBP";
      if (!valid) { gallery.discard(req); return res.status(400).json({ error: "El contenido del archivo no corresponde a una imagen permitida." }); }
    }
    next();
  });
}

app.get("/", (_req, res) => res.sendFile(path.join(ROOT, "index.html")));
app.get("/admin", (_req, res) => res.sendFile(path.join(ROOT, "admin.html")));
app.get("/styles.css", (_req, res) => res.sendFile(path.join(ROOT, "styles.css")));
app.get("/app.js", (_req, res) => res.sendFile(path.join(ROOT, "app.js")));
app.get("/admin.css", (_req, res) => res.sendFile(path.join(ROOT, "admin.css")));
app.get("/admin.js", (_req, res) => res.sendFile(path.join(ROOT, "admin.js")));

app.get("/api/vehicles", (_req, res) => {
  const rows = db.prepare('SELECT * FROM vehicles WHERE disponibilidad = ? ORDER BY id ASC').all("Activo");
  res.json(rows.map(mapVehicle));
});

app.get("/api/vehicles/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM vehicles WHERE id = ? AND disponibilidad = ?").get(Number(req.params.id), "Activo");
  if (!row) return res.status(404).json({ error: "Vehiculo no encontrado." });
  res.json(mapVehicle(row));
});

app.post("/api/quotes", requireUser, (req, res) => {
  const vehicleId = Number(req.body.vehicle_id);
  const nombre = req.user.nombre;
  const telefono = cleanText(req.body.telefono, 30);
  const correo = cleanText(req.body.correo, 120);
  const enganche = Number(req.body.enganche);
  const plazo = Number(req.body.plazo);
  const vehicle = db.prepare("SELECT id, precio FROM vehicles WHERE id = ? AND disponibilidad = ?").get(vehicleId, "Activo");
  const errors = [];

  if (!vehicle) errors.push("Selecciona un vehiculo valido.");
  if (!nombre) errors.push("Nombre requerido.");
  if (!isPhone(telefono)) errors.push("Telefono invalido.");
  if (!isEmail(correo)) errors.push("Correo invalido.");
  if (!Number.isInteger(enganche) || enganche < 0) errors.push("Enganche invalido.");
  if (vehicle && enganche > vehicle.precio) errors.push("El enganche no puede superar el precio.");
  if (![12, 24, 36, 48, 60, 72].includes(plazo)) errors.push("Plazo invalido.");
  if (errors.length) return res.status(400).json({ error: errors.join(" ") });

  const result = db.transaction(() => {
    const inserted = db.prepare(`
    INSERT INTO quotes (vehicle_id, nombre, telefono, correo, enganche, plazo, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(vehicleId, nombre, telefono, correo, enganche, plazo, req.user.id);
    notify(req.user.id, "Cotización recibida", `Recibimos tu cotización #${inserted.lastInsertRowid}. Un asesor revisará tu solicitud.`, "quotes", inserted.lastInsertRowid);
    return inserted;
  })();

  res.status(201).json({ id: result.lastInsertRowid, message: "Cotizacion guardada." });
});

app.post("/api/test-drives", requireUser, (req, res) => {
  const vehicleId = Number(req.body.vehicle_id);
  const nombre = req.user.nombre;
  const telefono = cleanText(req.body.telefono, 30);
  const correo = cleanText(req.body.correo, 120);
  const fecha = cleanText(req.body.fecha, 20);
  const hora = cleanText(req.body.hora, 10);
  const vehicle = db.prepare("SELECT id FROM vehicles WHERE id = ? AND disponibilidad = ?").get(vehicleId, "Activo");
  const scheduled = new Date(`${fecha}T${hora}:00-06:00`);
  const errors = [];

  if (!vehicle) errors.push("Selecciona un vehiculo valido.");
  if (!nombre) errors.push("Nombre requerido.");
  if (!isPhone(telefono)) errors.push("Telefono invalido.");
  if (!isEmail(correo)) errors.push("Correo invalido.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) errors.push("Fecha invalida.");
  const dateOnly = new Date(`${fecha}T00:00:00Z`);
  if (Number.isNaN(dateOnly.getTime()) || dateOnly.toISOString().slice(0, 10) !== fecha) errors.push("La fecha no existe en el calendario.");
  if (!/^(0[9]|1[0-8]):[0-5][0-9]$|^19:00$/.test(hora)) errors.push("El horario de atención es de 09:00 a 19:00, hora de Ciudad de México.");
  if (Number.isNaN(scheduled.getTime()) || scheduled < new Date()) errors.push("No puedes elegir fechas anteriores.");
  if (errors.length) return res.status(400).json({ error: errors.join(" ") });

  const result = db.transaction(() => {
    const inserted = db.prepare(`
    INSERT INTO test_drives (vehicle_id, nombre, telefono, correo, fecha, hora, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(vehicleId, nombre, telefono, correo, fecha, hora, req.user.id);
    notify(req.user.id, "Solicitud de cita recibida", `Prueba #${inserted.lastInsertRowid}: ${fecha} a las ${hora}, hora de Ciudad de México. Está pendiente de confirmación del equipo.`, "test-drives", inserted.lastInsertRowid);
    return inserted;
  })();

  res.status(201).json({ id: result.lastInsertRowid, message: "Cita guardada." });
});

app.get("/api/admin/dashboard", requireStaff, (_req, res) => {
  const vehicles = db.prepare("SELECT COUNT(*) AS count FROM vehicles").get().count;
  const activeVehicles = db.prepare("SELECT COUNT(*) AS count FROM vehicles WHERE disponibilidad = ?").get("Activo").count;
  const quotes = db.prepare("SELECT COUNT(*) AS count FROM quotes").get().count;
  const testDrives = db.prepare("SELECT COUNT(*) AS count FROM test_drives").get().count;
  res.json({ vehicles, activeVehicles, quotes, testDrives });
});

app.get("/api/admin/vehicles", requireStaff, (_req, res) => {
  res.json(db.prepare("SELECT * FROM vehicles ORDER BY id ASC").all().map(mapVehicle));
});

app.post("/api/admin/vehicles", requireAdmin, galleryUpload, (req, res) => {
  const { vehicle, errors } = validateVehiclePayload(req.body, uploadedImagePath(req.files?.imagen_archivo?.[0]), "");
  const images = gallery.prepare(req, null, vehicle);
  errors.push(...images.errors);
  if (errors.length) { gallery.discard(req); return res.status(400).json({ error: errors.join(" ") }); }

  const result = db.transaction(() => {
    const inserted = db.prepare(`
    INSERT INTO vehicles (
      marca, modelo, "año", precio, kilometraje, "carrocería", "transmisión",
      motor, color, "condición", imagen, "descripción", disponibilidad, glow
    ) VALUES (
      @marca, @modelo, @año, @precio, @kilometraje, @carrocería, @transmisión,
      @motor, @color, @condición, @imagen, @descripción, @disponibilidad, @glow
    )
  `).run(vehicle);
    gallery.save(inserted.lastInsertRowid, vehicle, images.routes);
    return inserted;
  })();
  res.status(201).json({ id: result.lastInsertRowid });
});

app.put("/api/admin/vehicles/:id", requireAdmin, galleryUpload, (req, res) => {
  const id = Number(req.params.id);
  const current = db.prepare("SELECT * FROM vehicles WHERE id = ?").get(id);
  if (!current) { gallery.discard(req); return res.status(404).json({ error: "Vehiculo no encontrado." }); }

  const { vehicle, errors } = validateVehiclePayload(req.body, uploadedImagePath(req.files?.imagen_archivo?.[0]), current.imagen);
  const images = gallery.prepare(req, current, vehicle);
  errors.push(...images.errors);
  if (errors.length) { gallery.discard(req); return res.status(400).json({ error: errors.join(" ") }); }

  db.transaction(() => { db.prepare(`
    UPDATE vehicles SET
      marca = @marca,
      modelo = @modelo,
      "año" = @año,
      precio = @precio,
      kilometraje = @kilometraje,
      "carrocería" = @carrocería,
      "transmisión" = @transmisión,
      motor = @motor,
      color = @color,
      "condición" = @condición,
      imagen = @imagen,
      "descripción" = @descripción,
      disponibilidad = @disponibilidad,
      glow = @glow
    WHERE id = @id
  `).run({ ...vehicle, id });
  gallery.save(id, vehicle, images.routes);
  })();
  res.json({ ok: true });
});

app.delete("/api/admin/vehicles/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const current = db.prepare("SELECT id FROM vehicles WHERE id = ?").get(id);
  if (!current) return res.status(404).json({ error: "Vehiculo no encontrado." });

  const usedQuotes = db.prepare("SELECT COUNT(*) AS count FROM quotes WHERE vehicle_id = ?").get(id).count;
  const usedTests = db.prepare("SELECT COUNT(*) AS count FROM test_drives WHERE vehicle_id = ?").get(id).count;
  if (usedQuotes || usedTests) {
    db.prepare("UPDATE vehicles SET disponibilidad = ? WHERE id = ?").run("Inactivo", id);
    return res.json({ ok: true, archived: true });
  }

  db.prepare("DELETE FROM vehicles WHERE id = ?").run(id);
  res.json({ ok: true });
});

app.get("/api/admin/quotes", requireStaff, (_req, res) => {
  const rows = db.prepare(`
    SELECT q.*, v.marca, v.modelo, v."año" AS año, u.username, u.role AS account_role,
      (SELECT COUNT(*) FROM request_messages m WHERE m.quote_id = q.id) AS message_count,
      (SELECT body FROM request_messages m WHERE m.quote_id = q.id ORDER BY m.id DESC LIMIT 1) AS last_message
    FROM quotes q
    JOIN vehicles v ON v.id = q.vehicle_id
    LEFT JOIN users u ON u.id = q.user_id
    ORDER BY q.fecha_registro DESC
  `).all();
  res.json(rows);
});

app.patch("/api/admin/quotes/:id", requireStaff, (req, res) => {
  const estado = cleanText(req.body.estado, 30);
  if (!["Nueva", "Contactada", "Aprobada", "Rechazada"].includes(estado)) {
    return res.status(400).json({ error: "Estado invalido." });
  }
  if (req.user.role === "empleado" && !["Nueva", "Contactada"].includes(estado)) return res.status(403).json({ error: "Solo el administrador puede aprobar o rechazar cotizaciones." });
  const currentQuote = db.prepare("SELECT * FROM quotes WHERE id = ?").get(Number(req.params.id));
  if (!currentQuote) return res.status(404).json({ error: "Cotización no encontrada." });
  if (currentQuote.user_id && db.prepare("SELECT role FROM users WHERE id = ?").get(currentQuote.user_id)?.role !== 'cliente') return res.status(409).json({ error: "Registro anterior con cuenta del equipo. Revisa la identidad del cliente antes de cambiar su estado." });
  if (req.user.role === "empleado" && ["Aprobada", "Rechazada"].includes(currentQuote?.estado)) return res.status(403).json({ error: "Una decisión del administrador no puede ser modificada por un empleado." });
  db.transaction(() => {
    db.prepare("UPDATE quotes SET estado = ? WHERE id = ?").run(estado, currentQuote.id);
    if (estado !== currentQuote.estado) notify(currentQuote.user_id, "Tu cotización se actualizó", `Cotización #${currentQuote.id}: ${estado}. Puedes escribir al equipo desde esta solicitud.`, "quotes", currentQuote.id);
  })();
  res.json({ ok: true });
});

app.get("/api/admin/test-drives", requireStaff, (_req, res) => {
  const rows = db.prepare(`
    SELECT t.*, v.marca, v.modelo, v."año" AS año, u.username, u.role AS account_role,
      (SELECT COUNT(*) FROM request_messages m WHERE m.test_drive_id = t.id) AS message_count,
      (SELECT body FROM request_messages m WHERE m.test_drive_id = t.id ORDER BY m.id DESC LIMIT 1) AS last_message
    FROM test_drives t
    JOIN vehicles v ON v.id = t.vehicle_id
    LEFT JOIN users u ON u.id = t.user_id
    ORDER BY t.fecha DESC, t.hora ASC
  `).all();
  res.json(rows);
});

app.patch("/api/admin/test-drives/:id", requireStaff, (req, res) => {
  const estado = cleanText(req.body.estado, 30);
  if (!["Pendiente", "Confirmada", "Realizada", "Cancelada"].includes(estado)) {
    return res.status(400).json({ error: "Estado invalido." });
  }
  const current = db.prepare("SELECT * FROM test_drives WHERE id = ?").get(Number(req.params.id));
  if (!current) return res.status(404).json({ error: "Cita no encontrada." });
  if (current.user_id && db.prepare("SELECT role FROM users WHERE id = ?").get(current.user_id)?.role !== 'cliente') return res.status(409).json({ error: "Registro anterior con cuenta del equipo. Revisa la identidad del cliente antes de cambiar su estado." });
  db.transaction(() => {
    db.prepare("UPDATE test_drives SET estado = ? WHERE id = ?").run(estado, current.id);
    if (estado !== current.estado) notify(current.user_id, "Tu prueba de manejo se actualizó", `Prueba #${current.id}: ${estado}. ${current.fecha} a las ${current.hora}, hora de Ciudad de México.`, "test-drives", current.id);
  })();
  res.json({ ok: true });
});

app.use((error, req, res, _next) => {
  gallery.discard(req);
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ error: error.code === "LIMIT_FILE_SIZE" ? "La imagen no debe superar 2 MB." : error.message });
  }
  if (error) return res.status(400).json({ error: error.message || "Solicitud invalida." });
  res.status(500).json({ error: "Error interno." });
});

app.listen(PORT, () => {
  console.log(`Nexora Autos local disponible en http://localhost:${PORT}`);
  console.log(`Base de datos: ${DB_PATH}`);
});
