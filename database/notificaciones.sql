-- Solo consulta del operador; ejecutar: npm run db:sql -- database/notificaciones.sql
SELECT n.id, u.username, n.title, n.body, n.request_type, n.request_id,
       n.created_at, n.read_at
FROM notifications n JOIN users u ON u.id = n.user_id
ORDER BY n.id DESC LIMIT 100;
