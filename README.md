# Nexora Autos

Aplicación web local para explorar vehículos, solicitar cotizaciones y pruebas de manejo, y dar seguimiento desde cuentas de cliente, asesor y administrador.

![Vehículo de la galería de Nexora](assets/bmw-m440i-frontal.png)

## Qué permite hacer

- Explorar el catálogo con filtros, galerías, carruseles, vehículos destacados y ofertas.
- Registrarse como cliente y entrar con una cuenta propia. El registro termina en el formulario de inicio de sesión.
- Guardar favoritos y consultar solicitudes, avisos y conversaciones privadas.
- Atender solicitudes desde las dos cuentas de asesor, con permisos limitados.
- Administrar vehículos, galerías, ofertas, estados y usuarios desde el panel de administración.

Cliente y equipo tienen accesos y sesiones separados. Recargar el catálogo conserva el portal de clientes; recargar /admin conserva el acceso del equipo. Una cotización es una solicitud de atención, no una compra ni un pago.

## Tecnologías

HTML, CSS y JavaScript en el navegador. Node.js y Express sirven la interfaz y la API. SQLite conserva los datos mediante better-sqlite3; bcryptjs gestiona contraseñas, express-session las sesiones y Multer las imágenes. Se mantienen las tecnologías del proyecto original.

## Instalar y ejecutar

Requisitos: Node.js 22.18 o posterior, npm y un navegador moderno. Se necesita conexión para instalar dependencias; después el funcionamiento es local.

```powershell
git clone https://github.com/ElMilaneso317/nexora-autos.git
cd nexora-autos
npm ci
```

En PowerShell, crea la configuración local:

```powershell
Copy-Item .env.example .env
npm start
```

En Linux o macOS puedes usar cp .env.example .env antes de npm start. Si ya existe .env, conserva tu configuración. SESSION_SECRET vacío genera una firma nueva al arrancar.

- Clientes: http://localhost:3000
- Equipo: http://localhost:3000/admin

Deja la terminal abierta. Ctrl+C detiene el servidor. npm run dev inicia el modo de desarrollo con reinicio del backend; los cambios del frontend se ven al recargar el navegador. Los BAT son atajos opcionales.

Para editar desde VS Code, abre Nexora-Autos.code-workspace o la carpeta clonada. El área de trabajo incluye tareas npm y depuración con F5; abrirla no ejecuta comandos automáticamente.

## Cuentas locales de demostración

El primer arranque crea una base nueva, seis vehículos iniciales y tres cuentas:

| Usuario | Contraseña inicial | Rol |
| --- | --- | --- |
| admin | Admin123! | Administrador |
| asesor1 | Asesor123! | Empleado |
| asesor2 | Asesor456! | Empleado |

Estas credenciales son semillas de demostración local. Los clientes crean sus cuentas desde Mi cuenta. El repositorio no contiene cuentas, solicitudes ni conversaciones de la base privada de trabajo. El séptimo vehículo añadido en aquella base tampoco forma parte de las semillas del servidor.

Las imágenes adicionales son ilustrativas del modelo; deben sustituirse por fotografías verificadas de la unidad si se utiliza inventario comercial real.

## Archivos principales

| Parte | Archivos |
| --- | --- |
| Catálogo y cuenta del cliente | index.html, styles.css, app.js |
| Panel de asesores y admin | admin.html, admin.css, admin.js |
| API y validaciones | server.js |
| Accesos y sesiones independientes | account-routes.js, session-auth.js |
| Avisos y conversaciones | customer-messaging.js |
| Galerías y migraciones | gallery.js, database-upgrade.js |
| Consultas SQL | database/ |
| Pruebas | tests/ |

La base real se crea en data/nexora.sqlite. database contiene consultas SQL de apoyo. El navegador no abre SQLite directamente; se comunica con la API. Un solo servidor Node.js ejecuta la aplicación.

## Pruebas y mantenimiento

```powershell
npm test
npm run test:db
npm run db:info
npm run db:sql -- database/consultas.sql
npm run backup
```

Las pruebas usan bases temporales; no insertan datos en la base habitual. La suite de API utiliza el puerto 3137. Sin respaldo_original se prueba la inicialización desde una base nueva; no se comprueba una migración sobre la base privada.

GitHub Actions ejecuta npm ci, npm test y npm run test:db en cada push a main y en las pull requests hacia main. La configuración está en .github/workflows/ci.yml y sigue la [guía oficial de pruebas de Node.js](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs).

Las escrituras con db:sql requieren --write y generan un respaldo previo. Conviene cambiar estados de solicitudes desde el panel para que se creen sus avisos. Los resultados de pruebas y exportaciones del esquema se generan en documentacion/ y quedan fuera del control de versiones.

## Alcance de esta publicación

Este repositorio contiene el código y las instrucciones para ejecutarlo. Los documentos académicos se entregan por separado. .env privado, bases de datos, nuevas subidas, respaldos y node_modules se excluyen con .gitignore.

La entrega es local: no procesa pagos, no autoriza créditos ni envía correos o notificaciones externas. Las sesiones se guardan en memoria y se cierran al reiniciar el servidor. La publicación del código en GitHub no equivale a alojar la aplicación web.
