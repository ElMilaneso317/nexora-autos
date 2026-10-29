"use strict";

// Dos ámbitos independientes: entrar al panel nunca sustituye la cuenta del cliente.
module.exports = function configureSessions({ app, db, session, secret }) {
  const makeSession = audience => session({
    name: `nexora.${audience}.sid`,
    secret: `${secret}:${audience}`,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax", secure: false, maxAge: 8 * 60 * 60 * 1000 }
  });
  const customerSession = makeSession("client");
  const staffSession = makeSession("staff");
  app.use((req, res, next) => {
    req.sessionAudience = req.path === "/admin" || req.path.startsWith("/api/admin/") ? "staff" : "client";
    (req.sessionAudience === "staff" ? staffSession : customerSession)(req, res, next);
  });
  app.use((req, res, next) => {
    if (req.session.userId) {
      req.user = db.prepare("SELECT id, username, nombre, role, activo FROM users WHERE id = ?").get(req.session.userId);
      const allowed = req.sessionAudience === "staff" ? ["admin", "empleado"] : ["cliente"];
      if (!req.user?.activo || !allowed.includes(req.user.role)) {
        delete req.session.userId;
        req.user = null;
      }
    }
    // El identificador no autentica: detecta una pestaña con la identidad antigua.
    const expected = req.get("X-Nexora-User");
    if (expected && req.user && expected !== String(req.user.id)) return res.status(409).json({
      error: "La cuenta de esta sesión cambió en otra pestaña. Inicia sesión de nuevo antes de continuar.", code: "SESSION_CHANGED"
    });
    next();
  });
};
