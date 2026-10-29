-- Consultar cuentas sin mostrar hashes de contraseña.
-- Ejecutar: npm run db:sql -- database/usuarios.sql
SELECT id, username, nombre, role, activo
FROM users
ORDER BY id;
