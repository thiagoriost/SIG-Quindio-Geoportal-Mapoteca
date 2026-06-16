# Manual de instalacion y despliegue en produccion

Este documento describe el proceso para compilar, desplegar y poner en marcha la aplicacion `SIG Quindio - Mapoteca` en un ambiente de produccion.

## 1. Objetivo

La aplicacion esta construida con React y Vite. En produccion se publica como un sitio estatico generado en la carpeta `dist/`.

El flujo recomendado es:

1. Instalar dependencias.
2. Generar la compilacion de produccion.
3. Copiar el contenido de `dist/` al servidor web.
4. Configurar el servidor para servir la aplicacion y permitir el acceso a los recursos PDF requeridos por la mapoteca.

## 2. Prerrequisitos

Antes de iniciar, verificar lo siguiente:

- Node.js 18 o superior instalado.
- npm disponible en consola.
- Acceso al servidor donde se publicara la aplicacion.
- Un servidor web configurado para contenido estatico, por ejemplo IIS, Nginx o Apache.
- Acceso a `https://sigquindio.gov.co/ArchivosQuindioIII/` o a una ruta equivalente dentro del mismo entorno de publicacion.

## 3. Instalacion del proyecto

Desde la raiz del proyecto ejecutar:

```bash
npm install
```

Este paso descarga todas las dependencias necesarias para compilar la aplicacion.

## 4. Compilacion para produccion

Ejecutar:

```bash
npm run build
```

Al finalizar, Vite generara la carpeta `dist/` con los archivos optimizados para produccion.

## 5. Resultado de la compilacion

La carpeta `dist/` contiene los archivos que deben publicarse en el servidor web:

- `index.html`
- `assets/` con JavaScript, CSS e imagenes optimizadas

No se debe publicar el codigo fuente de `src/` para la puesta en marcha. El despliegue de produccion se realiza con el contenido compilado de `dist/`.

## 6. Despliegue en el servidor

### Opcion A. Despliegue en la raiz de un sitio web

Copiar todo el contenido de `dist/` al directorio publico del sitio, por ejemplo:

- IIS: carpeta fisica del sitio o aplicacion.
- Nginx: ruta configurada en `root`.
- Apache: ruta configurada en `DocumentRoot`.

Ejemplo conceptual:

```text
dist/  ->  carpeta publica del sitio
```

### Opcion B. Despliegue en una subruta

Si la aplicacion se va a publicar en una subruta, por ejemplo `/mapoteca/`, es necesario ajustar previamente la configuracion de Vite para definir la propiedad `base` en `vite.config.js` y volver a compilar.

Ejemplo:

```js
export default defineConfig({
  base: '/mapoteca/',
  plugins: [react()],
})
```

Despues de este ajuste se debe ejecutar de nuevo:

```bash
npm run build
```

Si la publicacion sera en la raiz del sitio, no se requiere este cambio.

## 7. Puesta en marcha del servidor web

El servidor debe quedar configurado para:

1. Entregar archivos estaticos desde la carpeta publicada.
2. Responder `index.html` cuando el usuario navegue a la raiz de la aplicacion.
3. Permitir el acceso de la aplicacion a la ruta de documentos PDF usada por la mapoteca.

## 8. Consideracion clave sobre los PDF de la mapoteca

La aplicacion intenta consultar directorios y archivos PDF publicados en:

```text
https://sigquindio.gov.co/ArchivosQuindioIII/SIG_QUINDIO/MAPOTECA/
```

En desarrollo local existe un proxy de Vite para pruebas. Sin embargo, ese proxy no aplica en produccion. Por lo tanto, en ambiente productivo se recomienda una de estas dos opciones:

### Opcion recomendada

Publicar la aplicacion dentro del mismo dominio `sigquindio.gov.co`, de manera que el navegador pueda acceder a las carpetas y PDFs sin bloqueos de CORS.

### Opcion alternativa

Configurar el servidor o un backend intermedio para exponer esas rutas con permisos CORS adecuados o como proxy inverso.

Si ninguna de estas opciones esta disponible, la carga dinamica de PDFs puede fallar y la app solo mostrara la informacion de respaldo definida en `src/data/fallbackPdfs.js`.

## 9. Verificacion posterior al despliegue

Despues de publicar la aplicacion, validar lo siguiente:

1. La URL principal carga sin errores.
2. Se muestran correctamente estilos, imagenes y scripts.
3. La seccion de mapoteca lista documentos.
4. Los filtros funcionan.
5. El modal de visualizacion abre los archivos PDF.
6. En la consola del navegador no aparecen errores de CORS ni errores 404 sobre recursos estaticos.

## 10. Comando recomendado para validacion local del build

Antes de desplegar al servidor, se recomienda probar localmente la version compilada con:

```bash
npm run preview
```

Luego abrir en navegador:

```text
http://localhost:4173
```

Esto permite validar que la version de produccion generada por Vite funciona antes de copiarla al servidor definitivo.

## 11. Procedimiento resumido

```bash
npm install
npm run build
npm run preview
```

Despues de validar, copiar el contenido de `dist/` al servidor web de produccion.

## 12. Observaciones operativas

- Cada vez que se realicen cambios en el codigo fuente, se debe volver a ejecutar `npm run build`.
- El despliegue siempre debe hacerse con una copia nueva del contenido de `dist/`.
- Si se cambia la ruta de publicacion del sitio, debe revisarse la configuracion `base` de Vite antes de compilar.
- Si se presentan problemas al cargar PDFs, revisar primero conectividad, permisos del servidor y reglas CORS.