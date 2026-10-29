"use strict";
const fs = require("fs");
const path = require("path");

module.exports = function gallery(db, root) {
  const validPath = value => /^(assets|uploads)\/[a-zA-Z0-9_./-]+\.(png|jpe?g|webp)$/i.test(value) && !value.includes("..") && fs.existsSync(path.join(root, value));
  const discard = req => Object.values(req.files || {}).flat().forEach(f => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });
  const prepare = (req, current, vehicle) => {
    const uploaded = (req.files?.imagenes_archivos || []).map(f => `uploads/${f.filename}`);
    const old = current ? db.prepare("SELECT ruta FROM vehicle_images WHERE vehicle_id = ? ORDER BY posicion").all(current.id).map(x => x.ruta) : [];
    const supplied = req.body.imagenes === undefined ? old : String(req.body.imagenes).split(/\r?\n/).map(x => x.trim()).filter(Boolean);
    const routes = [...new Set([vehicle.imagen, ...supplied, ...uploaded])];
    const errors = [];
    if (routes.length < 2 || routes.length > 10) errors.push("La galería debe contener entre 2 y 10 imágenes distintas del mismo vehículo.");
    if (routes.some(x => !validPath(x))) errors.push("Usa imágenes locales existentes de assets/ o uploads/ con formato JPG, PNG o WebP.");
    vehicle.destacado = [true, 1, "1", "on"].includes(req.body.destacado) ? 1 : 0;
    vehicle.oferta = String(req.body.oferta || "").trim().slice(0, 120);
    vehicle.precio_anterior = req.body.precio_anterior ? Number(req.body.precio_anterior) : null;
    if (vehicle.precio_anterior !== null && (!Number.isInteger(vehicle.precio_anterior) || vehicle.precio_anterior <= vehicle.precio)) errors.push("El precio anterior debe ser mayor que el precio actual.");
    return { routes, errors };
  };
  const save = (id, vehicle, routes) => {
    db.prepare("UPDATE vehicles SET destacado = ?, precio_anterior = ?, oferta = ? WHERE id = ?").run(vehicle.destacado, vehicle.precio_anterior, vehicle.oferta, id);
    const previous = db.prepare("SELECT ruta, etiqueta FROM vehicle_images WHERE vehicle_id = ?").all(id);
    db.prepare("DELETE FROM vehicle_images WHERE vehicle_id = ?").run(id);
    const add = db.prepare("INSERT INTO vehicle_images(vehicle_id, ruta, etiqueta, posicion) VALUES (?, ?, ?, ?)");
    routes.forEach((ruta, index) => add.run(id, ruta, previous.find(x => x.ruta === ruta)?.etiqueta || `Fotografía ${index + 1}`, index));
  };
  return { prepare, save, discard };
};
