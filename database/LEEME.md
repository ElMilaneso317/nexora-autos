# Base de datos de Nexora

La base activa es `data/nexora.sqlite`. Esta carpeta contiene SQL de trabajo, no otra base de datos.

- `consultas.sql`: inventario; `npm run db:sql`.
- `usuarios.sql`: cuentas sin hashes; `npm run db:sql -- database/usuarios.sql`.
- `editar-ejemplo.sql`: ejemplo de UPDATE con identificador que no afecta vehículos actuales. Ajusta sus valores y utiliza `--write` para aplicarlo.

También puedes abrir el archivo SQLite directamente en VS Code con SQLite3 Editor. La guía completa está en [DESARROLLO_VSCODE.md](../DESARROLLO_VSCODE.md).

Las tablas se crean en `server.js` y sus ampliaciones en `database-upgrade.js`. `documentacion/esquema.sql` es una exportación de referencia que puedes regenerar con `npm run db:schema`.
