-- Inventario. Ejecutar: npm run db:sql
-- Una instrucción por archivo en la herramienta de terminal.
SELECT id, marca, modelo, "año", precio, disponibilidad, destacado,
       precio_anterior, oferta
FROM vehicles
ORDER BY id;
