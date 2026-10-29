"use strict";

// Todos los destinatarios y remitentes se obtienen de la sesión o de la solicitud.
module.exports = function messaging({ app, db, requireStaff }) {
  const requireUser = (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Regístrate o inicia sesión con una cuenta de cliente para continuar." });
    if (req.user.role !== "cliente") return res.status(403).json({ error: "Las solicitudes solo pueden enviarse desde una cuenta de cliente." });
    next();
  };
  const notify = (userId, title, body, type = null, id = null) => {
    if (userId) db.prepare("INSERT INTO notifications(user_id, title, body, request_type, request_id) VALUES (?, ?, ?, ?, ?)").run(userId, title, body, type, id);
  };
  app.get("/api/account/notifications", requireUser, (req, res) => {
    const items = db.prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 100").all(req.user.id);
    const unread = db.prepare("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL").get(req.user.id).n;
    res.json({ items, unread });
  });
  app.patch("/api/account/notifications/read", requireUser, (req, res) => {
    db.prepare("UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND read_at IS NULL").run(req.user.id);
    res.json({ ok: true });
  });
  app.patch("/api/account/notifications/:id/read", requireUser, (req, res) => {
    const result = db.prepare("UPDATE notifications SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP) WHERE id = ? AND user_id = ?").run(Number(req.params.id), req.user.id);
    if (!result.changes) return res.status(404).json({ error: "Aviso no encontrado." });
    res.json({ ok: true });
  });
  const routes = [["/api/account/requests", requireUser, false], ["/api/admin/requests", requireStaff, true]];
  for (const [prefix, guard, staff] of routes) {
    const request = (req, res, next) => {
      const type = req.params.type;
      if (!["quotes", "test-drives"].includes(type)) return res.status(404).json({ error: "Tipo de solicitud no encontrado." });
      const table = type === "quotes" ? "quotes" : "test_drives";
      const row = db.prepare(`SELECT r.*, u.username, u.role AS account_role FROM ${table} r LEFT JOIN users u ON u.id = r.user_id WHERE r.id = ?`).get(Number(req.params.id));
      if (!row || (!staff && row.user_id !== req.user.id)) return res.status(404).json({ error: "Solicitud no encontrada." });
      if (!row.user_id) return res.status(409).json({ error: "Registro anterior sin cuenta vinculada. Usa sus datos de contacto." });
      if (row.account_role !== "cliente") return res.status(409).json({ error: "Este registro anterior quedó vinculado a una cuenta del equipo. Revisa quién era el cliente antes de dar seguimiento." });
      req.customerRequest = row;
      req.messageColumn = type === "quotes" ? "quote_id" : "test_drive_id";
      next();
    };
    app.get(`${prefix}/:type/:id/messages`, guard, request, (req, res) => {
      const messages = db.prepare(`SELECT m.id, m.body, m.created_at, m.sender_id, u.nombre AS sender_name,
        CASE WHEN m.sender_id = ? THEN 'cliente' ELSE 'equipo' END AS sender_kind
        FROM request_messages m JOIN users u ON u.id = m.sender_id WHERE m.${req.messageColumn} = ? ORDER BY m.id`).all(req.customerRequest.user_id, req.customerRequest.id);
      res.json({ request: { id: req.customerRequest.id, nombre: req.customerRequest.nombre, username: req.customerRequest.username, estado: req.customerRequest.estado }, messages });
    });
    app.post(`${prefix}/:type/:id/messages`, guard, request, (req, res) => {
      const body = typeof req.body.body === "string" ? req.body.body.trim() : "";
      if (!body || body.length > 2000) return res.status(400).json({ error: "Escribe un mensaje de 1 a 2000 caracteres." });
      const result = db.transaction(() => {
        const inserted = db.prepare(`INSERT INTO request_messages(${req.messageColumn}, sender_id, body) VALUES (?, ?, ?)`).run(req.customerRequest.id, req.user.id, body);
        if (staff && req.user.id !== req.customerRequest.user_id) notify(req.customerRequest.user_id, "Nuevo mensaje de Nexora", `${req.user.nombre}: ${body}`, req.params.type, req.customerRequest.id);
        return inserted;
      })();
      res.status(201).json({ id: result.lastInsertRowid });
    });
  }
  return { notify, requireUser };
};
