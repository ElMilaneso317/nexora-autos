-- Solo consulta; ejecutar: npm run db:sql -- database/solicitudes-cuentas.sql
SELECT 'Cotización' AS tipo, q.id AS solicitud_id, q.user_id, u.username, q.nombre, q.estado
FROM quotes q LEFT JOIN users u ON u.id = q.user_id
UNION ALL
SELECT 'Prueba', t.id, t.user_id, u.username, t.nombre, t.estado
FROM test_drives t LEFT JOIN users u ON u.id = t.user_id
ORDER BY tipo, solicitud_id DESC;
