# SIG Quindío - Geoportal y Mapoteca en React

Demo completo basado en el prototipo visual del geoportal y la mapoteca.

## Qué incluye

- Portal principal estilo SIG Quindío.
- Mapoteca con categorías laterales.
- Búsqueda por nombre de PDF.
- Filtros por categoría, municipio, escala, año y formato.
- Cards de mapas.
- Modal para visualizar PDF con `iframe`.
- Consumo dinámico de carpetas públicas de PDFs.
- Datos de respaldo para que el demo se vea aunque exista bloqueo CORS en local.

## Ejecutar

```bash
npm install
npm run dev
```

Abrir:

```text
http://localhost:5173
```

## Documentacion de despliegue

La guia para despliegue y puesta en marcha en produccion se encuentra en:

```text
MANUAL_INSTALACION_PRODUCCION.md
```

## Importante sobre CORS

El demo intenta leer estas carpetas públicas:

```text
https://sigquindio.gov.co/ArchivosQuindioIII/SIG_QUINDIO/MAPOTECA/AGROPECUARIO/
https://sigquindio.gov.co/ArchivosQuindioIII/SIG_QUINDIO/MAPOTECA/AMBIENTAL/
https://sigquindio.gov.co/ArchivosQuindioIII/SIG_QUINDIO/MAPOTECA/CARTOGRAFIA_BASICA/
https://sigquindio.gov.co/ArchivosQuindioIII/SIG_QUINDIO/MAPOTECA/EDUCACION/
https://sigquindio.gov.co/ArchivosQuindioIII/SIG_QUINDIO/MAPOTECA/GESTION_DEL_RIESGO/
https://sigquindio.gov.co/ArchivosQuindioIII/SIG_QUINDIO/MAPOTECA/INDUSTRIA_COMERCIO/
https://sigquindio.gov.co/ArchivosQuindioIII/SIG_QUINDIO/MAPOTECA/ORDENAMIENTO_TERRITORIAL/
https://sigquindio.gov.co/ArchivosQuindioIII/SIG_QUINDIO/MAPOTECA/SALUD/
https://sigquindio.gov.co/ArchivosQuindioIII/SIG_QUINDIO/MAPOTECA/SOCIOECONOMICO/
```

Si se ejecuta en local y el navegador bloquea por CORS, la app muestra datos de respaldo definidos en:

```text
src/data/fallbackPdfs.js
```

En producción, si se despliega dentro del mismo dominio `sigquindio.gov.co`, debería poder consumir las carpetas directamente.

## Archivos principales

```text
src/pages/Home.jsx
src/pages/Mapoteca.jsx
src/data/categories.js
src/data/fallbackPdfs.js
src/services/mapotecaService.js
src/styles/global.css
```
