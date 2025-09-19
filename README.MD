# Sistema de Control de Horas Local

Sistema para registrar horas laborales que funciona completamente de manera local utilizando SQLite como base de datos.

## Características

- Registro de inicio y fin de jornada
- Control de actividades diarias
- Historial con filtrado por fecha
- Edición y eliminación de registros
- Exportación a PDF y Excel
- Sistema de respaldo y restauración de datos
- Base de datos SQLite local
- Funciona sin conexión a internet

## Instalación

1. Clona o descarga este repositorio
2. Instala las dependencias: `npm install`
3. Inicia el servidor local: `npm start`
4. Abre tu navegador en `http://localhost:8080`

## Uso

1. **Iniciar jornada**: Haz clic en "Iniciar Jornada" cuando comiences a trabajar
2. **Registrar actividades**: Escribe las actividades realizadas durante el día
3. **Finalizar jornada**: Haz clic en "Finalizar Jornada" cuando termines de trabajar
4. **Ver historial**: Consulta tu historial de jornadas en la tabla inferior
5. **Exportar datos**: Exporta tus registros a PDF o Excel cuando lo necesites

## Respaldo de datos

El sistema crea automáticamente respaldos de la base de datos en tu navegador. También puedes:

- Crear respaldos manualmente con el botón "Crear Respaldo"
- Restaurar desde un respaldo con el botón "Restaurar Respaldo"

## Notas importantes

- Los datos se almacenan localmente en tu navegador
- Cada usuario tendrá su propia base de datos independiente
- Para transferir datos entre dispositivos, usa la función de respaldo/restauración
