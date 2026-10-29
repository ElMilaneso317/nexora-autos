"use strict";

module.exports = function accounts({ app, db, bcrypt, requireAdmin, requireStaff, cleanText, notify }) {
  const publicUser = u => ({ id: u.id, username: u.username, nombre: u.nombre, role: u.role });
  const requireUser = (req, res, next) => req.user ? next() : res.status(401).json({ error: "Inicia sesión para continuar." });
  const attempts = new Map();
  // Limita intentos por IP, tanto login como registro, sin nuevas dependencias.
  const throttle = (req, res, next) => {
    const now = Date.now();
    for (const [key, value] of attempts) if (value.until < now) attempts.delete(key);
    const a = attempts.get(req.ip) || { count: 0, until: now + 10 * 60 * 1000 };
    attempts.set(req.ip, a);
    if (++a.count > 30) return res.status(429).json({ error: "Demasiados intentos. Espera diez minutos." });
    next();
  };
  const validateAccount = b => {
    if (!/^[a-zA-Z0-9_.@-]{3,60}$/.test(String(b.username || ""))) return "Usuario de 3 a 60 caracteres sin espacios.";
    const p = String(b.password || "");
    if (p.length < 8 || Buffer.byteLength(p, "utf8") > 72 || !/[A-Za-z]/.test(p) || !/[0-9]/.test(p)) return "Contraseña de al menos 8 caracteres con letras y números y hasta 72 bytes.";
    if (!cleanText(b.nombre)) return "Nombre requerido.";
    return "";
  };
  const login = staff => (req, res) => {
    const u = db.prepare("SELECT * FROM users WHERE username = ? AND activo = 1").get(cleanText(req.body.username, 60));
    if (!u || !bcrypt.compareSync(String(req.body.password || ""), u.password_hash)) return res.status(401).json({ error: "Usuario o contraseña incorrectos." });
    if (staff && !["admin", "empleado"].includes(u.role)) return res.status(403).json({ error: "Esta cuenta accede desde Mi cuenta en el catálogo." });
    if (!staff && u.role !== "cliente") return res.status(403).json({ error: "Esta cuenta pertenece al equipo. Inicia sesión en el acceso de asesores y administración.", loginUrl: "/admin" });
    req.session.regenerate(error => {
      if (error) return res.status(500).json({ error: "No se pudo iniciar la sesión." });
      req.session.userId = u.id;
      req.session.save(error => error ? res.status(500).json({ error: "No se pudo guardar la sesión." }) : res.json(publicUser(u)));
    });
  };
  app.post("/api/auth/login", throttle, login(false));
  app.post("/api/admin/login", throttle, login(true));
  app.post("/api/auth/register", throttle, (req, res) => {
    const error = validateAccount(req.body);
    if (error) return res.status(400).json({ error });
    const username = cleanText(req.body.username, 60);
    if (db.prepare("SELECT id FROM users WHERE username = ?").get(username)) return res.status(409).json({ error: "Ese usuario ya está registrado." });
    db.transaction(() => {
      const created = db.prepare("INSERT INTO users(username, password_hash, nombre, role) VALUES (?, ?, ?, 'cliente')").run(username, bcrypt.hashSync(req.body.password, 12), cleanText(req.body.nombre));
      notify(created.lastInsertRowid, "Bienvenido a Nexora", "Tu cuenta ya está registrada. Aquí recibirás las confirmaciones, los cambios de estado y los mensajes de tus asesores.");
    })();
    req.session.destroy(error => {
      if (error) return res.status(500).json({ error: "Cuenta creada. No se pudo cerrar la sesión anterior; vuelve a iniciar sesión." });
      res.clearCookie("nexora.client.sid", { path: "/" });
      res.status(201).json({ registered: true, username, role: "cliente", loginUrl: `/?login=1&usuario=${encodeURIComponent(username)}&registro=1` });
    });
  });
  app.get("/api/auth/session", (req, res) => res.json({ authenticated: Boolean(req.user), user: req.user ? publicUser(req.user) : null }));
  app.get("/api/admin/session", requireStaff, (req, res) => res.json({ authenticated: true, ...publicUser(req.user) }));
  const logout = (req, res) => req.session.destroy(error => {
    if (error) return res.status(500).json({ error: "No se pudo cerrar la sesión. Intenta de nuevo." });
    res.clearCookie(`nexora.${req.sessionAudience}.sid`, { path: "/" }); res.json({ ok: true });
  });
  app.post("/api/auth/logout", logout);
  app.post("/api/admin/logout", logout);
  const changePassword = (req, res) => {
    const u = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
    if (!bcrypt.compareSync(String(req.body.current || ""), u.password_hash)) return res.status(400).json({ error: "La contraseña actual es incorrecta." });
    const error = validateAccount({ ...u, password: req.body.password });
    if (error) return res.status(400).json({ error });
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(bcrypt.hashSync(req.body.password, 12), u.id);
    res.json({ ok: true });
  };
  app.put("/api/auth/password", requireUser, changePassword);
  app.put("/api/admin/password", requireStaff, changePassword);
  app.get("/api/account/requests", requireUser, (req, res) => {
    const get = table => db.prepare(`SELECT r.*, v.marca, v.modelo,
      (SELECT COUNT(*) FROM request_messages m WHERE m.${table === 'quotes' ? 'quote_id' : 'test_drive_id'} = r.id) AS message_count
      FROM ${table} r JOIN vehicles v ON v.id = r.vehicle_id WHERE r.user_id = ? ORDER BY r.id DESC`).all(req.user.id);
    res.json({ quotes: get("quotes"), testDrives: get("test_drives") });
  });
  app.get("/api/account/favorites", requireUser, (req, res) => res.json(db.prepare("SELECT vehicle_id FROM favorites WHERE user_id = ?").all(req.user.id).map(x => x.vehicle_id)));
  app.put("/api/account/favorites/:id", requireUser, (req, res) => {
    if (!db.prepare("SELECT id FROM vehicles WHERE id = ? AND disponibilidad = 'Activo'").get(Number(req.params.id))) return res.status(404).json({ error: "Vehículo no disponible." });
    db.prepare("INSERT OR IGNORE INTO favorites(user_id, vehicle_id) VALUES (?, ?)").run(req.user.id, Number(req.params.id));
    res.json({ ok: true });
  });
  app.delete("/api/account/favorites/:id", requireUser, (req, res) => {
    db.prepare("DELETE FROM favorites WHERE user_id = ? AND vehicle_id = ?").run(req.user.id, Number(req.params.id)); res.json({ ok: true });
  });
  app.get("/api/admin/users", requireAdmin, (_req, res) => res.json(db.prepare("SELECT id, username, nombre, role, activo, fecha_registro FROM users ORDER BY id").all()));
  app.post("/api/admin/users", requireAdmin, (req, res) => {
    const error = validateAccount(req.body);
    if (error) return res.status(400).json({ error });
    if (!["admin", "empleado", "cliente"].includes(req.body.role)) return res.status(400).json({ error: "Rol inválido." });
    const username = cleanText(req.body.username, 60);
    if (db.prepare("SELECT id FROM users WHERE username = ?").get(username)) return res.status(409).json({ error: "Usuario ya registrado." });
    const r = db.prepare("INSERT INTO users(username, password_hash, nombre, role) VALUES (?, ?, ?, ?)").run(username, bcrypt.hashSync(req.body.password, 12), cleanText(req.body.nombre), req.body.role);
    const loginUrl = req.body.role === "cliente" ? `/?login=1&usuario=${encodeURIComponent(username)}&registro=1` : `/admin?usuario=${encodeURIComponent(username)}&registro=1`;
    res.status(201).json({ id: r.lastInsertRowid, username, role: req.body.role, loginUrl });
  });
  app.patch("/api/admin/users/:id", requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    if (id === req.user.id) return res.status(400).json({ error: "No puedes cambiar tu propio rol o desactivar tu sesión." });
    const u = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
    if (!u) return res.status(404).json({ error: "Usuario no encontrado." });
    const role = req.body.role ?? u.role;
    const activo = req.body.activo === undefined ? u.activo : Number(req.body.activo);
    if (!["admin", "empleado", "cliente"].includes(role) || ![0,1].includes(activo)) return res.status(400).json({ error: "Rol o estado inválido." });
    if (u.role === "admin" && u.activo && (role !== "admin" || !activo) && db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND activo = 1").get().n <= 1) return res.status(400).json({ error: "Debe quedar un administrador activo." });
    db.prepare("UPDATE users SET role = ?, activo = ? WHERE id = ?").run(role, activo, id);
    res.json({ ok: true });
  });
};
