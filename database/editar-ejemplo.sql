-- Ejemplo de edición manual. No se ejecuta al arrancar el proyecto.
-- Primero consulta el inventario y reemplaza -1 por el id que deseas modificar.
-- El precio es un ejemplo: ajústalo antes de aplicar.
-- Ejecutar: npm run db:sql -- database/editar-ejemplo.sql --write
-- La herramienta guarda un respaldo de SQLite antes de escribir.
-- id = -1 no coincide con los vehículos actuales.
UPDATE vehicles
SET precio = 1349900, precio_anterior = NULL, oferta = ''
WHERE id = -1;
