# Plantillas de configuración de producción

Estos archivos no contienen credenciales reales y pueden versionarse en GitHub.

| Plantilla | Archivo de destino sugerido |
| --- | --- |
| [auth-service.env.example](auth-service.env.example) | `/opt/app/config/auth-service.env` |
| [morosos-service.env.example](morosos-service.env.example) | `/opt/app/config/morosos-service.env` |
| [Frontend](../frontend/.env.production.example) | `frontend/.env.production`, en el entorno de compilación |

## Backend

Copiar las plantillas fuera del repositorio, completar los marcadores `REEMPLAZAR_...` y limitar la lectura de los archivos a quienes administran los servicios. No ejecutar las plantillas sin completarlas.

Los servicios Java no cargan estos archivos automáticamente: las unidades systemd deben usar `EnvironmentFile=/opt/app/config/auth-service.env` y `EnvironmentFile=/opt/app/config/morosos-service.env`, respectivamente. Las unidades systemd y Nginx todavía deben prepararse.

`JWT_SECRET`, `JWT_ISSUER` y `JWT_AUDIENCE` deben coincidir en ambos servicios. Los usuarios de PostgreSQL indicados deben existir y disponer de permisos sobre su base y para las migraciones Flyway.

La configuración supone PostgreSQL y ambos microservicios en la misma EC2. Los microservicios escuchan únicamente en localhost y se accede a sus APIs a través de Nginx.

## Administrador inicial

La plantilla mantiene `AUTH_SEED_ADMIN_ENABLED=false` para no crear una cuenta accidentalmente.

En el primer arranque sobre `auth_db` nueva:

1. Generar una contraseña única y aleatoria para el administrador y asignarla a `AUTH_SEED_ADMIN_PASSWORD` en el archivo real.
2. Configurar `AUTH_SEED_ADMIN_ENABLED=true`.
3. Iniciar autenticación y verificar el ingreso del administrador `admin`, con correo `lucianogatti01@gmail.com`.
4. Volver a `AUTH_SEED_ADMIN_ENABLED=false`, retirar la contraseña del archivo y reiniciar el servicio.

Ver [primer arranque de producción](../docs/primer-arranque-produccion.md).

## Frontend

Copiar `frontend/.env.production.example` a `frontend/.env.production` y ejecutar `npm ci` y `npm run build` dentro de `frontend`. Las URLs se incorporan al build; modificarlas requiere recompilar.

El dominio previsto es `https://recaudacion.aosc-enteregulador.gob.ar`. Nginx debe distinguir las rutas de autenticación y administración de usuarios/roles de las de gestión; no basta con enviar todo `/api/v1` a un solo servicio.

Google está habilitado en la plantilla. Antes de compilar e iniciar, completar `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en el archivo real de autenticación, y el mismo identificador público en `VITE_GOOGLE_CLIENT_ID` del frontend. Los marcadores `REEMPLAZAR_...` no son credenciales válidas. El cliente OAuth debe estar configurado para el dominio productivo. El secreto OAuth pertenece exclusivamente al backend y no se sube a GitHub.

La autenticación con Google no omite la aprobación administrativa ni los permisos internos. SMTP permanece deshabilitado hasta configurar el correo.

## Archivos que se suben

Subir únicamente las plantillas `.example`. Los archivos reales `.env`, `*.env` y `.env.production` están excluidos por `.gitignore`. Esta exclusión no protege una carga manual desde la web de GitHub ni archivos ya versionados.
