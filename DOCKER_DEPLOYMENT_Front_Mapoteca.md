# Guía de Despliegue en Docker - SIG Quindío Mapoteca

Este documento describe el proceso para compilar, construir y desplegar la aplicación `SIG Quindío - Mapoteca` en contenedores Docker.

## Tabla de Contenidos

1. [Requisitos](#requisitos)
2. [Estructura de Archivos](#estructura-de-archivos)
3. [Dockerfile](#dockerfile)
4. [Docker Compose](#docker-compose)
5. [Configuración de Nginx](#configuración-de-nginx)
6. [Despliegue](#despliegue)
7. [Gestión de Volúmenes](#gestión-de-volúmenes)
8. [Consideraciones de Seguridad](#consideraciones-de-seguridad)
9. [Monitoreo y Logs](#monitoreo-y-logs)
10. [Solución de Problemas](#solución-de-problemas)

---

## Requisitos

- Docker 20.10 o superior
- Docker Compose 1.29 o superior
- Node.js 18 o superior (para desarrollo local)
- ~500MB de espacio en disco
- Acceso a los repositorios de imágenes de Docker

---

## Estructura de Archivos

```
Mapoteca_sig-quindio-react-completo/
├── Dockerfile
├── docker-compose.yml
├── nginx.conf
├── .dockerignore
├── src/
├── public/
├── package.json
├── vite.config.js
└── (otros archivos del proyecto)
```

---

## Dockerfile

Crear un archivo `Dockerfile` en la raíz del proyecto con un enfoque **multi-stage** para optimizar el tamaño de la imagen:

```dockerfile
# Etapa 1: Builder
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json ./

# Instalar dependencias
RUN npm ci --only=production && \
    npm ci && \
    npm cache clean --force

# Copiar el código fuente
COPY . .

# Compilar la aplicación para producción
RUN npm run build

# Etapa 2: Runtime
FROM nginx:alpine

# Instalar utilidades útiles
RUN apk add --no-cache curl

# Copiar archivos compilados desde el builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Crear directorio para logs
RUN mkdir -p /var/log/nginx && \
    chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/log/nginx

# Usuario nginx sin privilegios root
USER nginx

# Exponer puerto
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost/index.html || exit 1

# Comando por defecto
CMD ["nginx", "-g", "daemon off;"]
```

### Explicación del Dockerfile

| Sección | Propósito |
|---------|-----------|
| **Etapa Builder** | Compilar la aplicación React con Vite |
| **npm ci** | Instalación reproducible y determinista |
| **npm run build** | Generar artefactos de producción en `dist/` |
| **Etapa Runtime** | Servir la app compilada con Nginx (imagen ligera) |
| **Alpine Linux** | Reduce el tamaño de la imagen (~50MB vs 200MB+) |
| **Health Check** | Verifica que la aplicación esté disponible |
| **USER nginx** | Evita ejecutar como root por seguridad |

---

## Docker Compose

Crear un archivo `docker-compose.yml` para orquestar el contenedor:

```yaml
version: '3.8'

services:
  mapoteca:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: mapoteca-app
    ports:
      - "80:80"
      - "443:443"
    environment:
      - NODE_ENV=production
      - VITE_API_BASE=https://sigquindio.gov.co
    volumes:
      # Volumen para archivos estáticos (PDFs)
      - mapoteca-data:/usr/share/nginx/html/pdfs:ro
      # Volumen para logs
      - mapoteca-logs:/var/log/nginx
      # Volumen para caché de Nginx
      - nginx-cache:/var/cache/nginx
    networks:
      - mapoteca-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/index.html"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
    labels:
      - "com.example.description=Mapoteca SIG Quindío"
      - "com.example.version=1.0.0"

volumes:
  mapoteca-data:
    driver: local
  mapoteca-logs:
    driver: local
  nginx-cache:
    driver: local

networks:
  mapoteca-network:
    driver: bridge
```

### Configuración de `docker-compose.yml`

| Elemento | Descripción |
|----------|-------------|
| **services.mapoteca** | Servicio principal de la aplicación |
| **build.context** | Directorio del Dockerfile |
| **ports** | Mapeo de puertos (host:contenedor) |
| **volumes** | Almacenamiento persistente |
| **networks** | Red interna de Docker |
| **restart** | Política de reinicio automático |
| **healthcheck** | Verificación de disponibilidad |
| **labels** | Metadatos del contenedor |

---

## Configuración de Nginx

Crear un archivo `nginx.conf` personalizado:

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    # Optimizaciones de performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 20M;

    # Compresión gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript 
               application/json application/javascript application/xml+rss 
               application/rss+xml font/truetype font/opentype 
               application/vnd.ms-fontobject image/svg+xml;
    gzip_disable "msie6";

    # Cache headers
    map $sent_http_content_type $expires {
        default off;
        text/html epoch;
        text/css max;
        application/javascript max;
        ~image/ max;
        ~font/ max;
    }

    expires $expires;

    # Virtual Host
    server {
        listen 80 default_server;
        server_name _;

        root /usr/share/nginx/html;
        index index.html index.htm;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

        # Archivos estáticos con caché agresivo
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
        }

        # Servir index.html para rutas no encontradas (SPA)
        location / {
            try_files $uri $uri/ /index.html;
            add_header Cache-Control "public, max-age=0, must-revalidate";
        }

        # Proxy para PDFs (si se mantienen en ruta externa)
        location /ArchivosQuindioIII/ {
            proxy_pass https://sigquindio.gov.co/ArchivosQuindioIII/;
            proxy_ssl_verify off;
            proxy_set_header Host sigquindio.gov.co;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_buffering on;
            proxy_buffer_size 128k;
            proxy_buffers 4 256k;
            proxy_busy_buffers_size 256k;
            expires 7d;
        }

        # Bloquear acceso a archivos sensibles
        location ~ /\. {
            deny all;
            access_log off;
            log_not_found off;
        }

        location ~ ~$ {
            deny all;
            access_log off;
            log_not_found off;
        }
    }

    # Health check endpoint
    server {
        listen 80;
        server_name health;

        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
```

### Características de la Configuración Nginx

| Característica | Beneficio |
|---|---|
| **Compresión gzip** | Reduce tamaño de transferencia 60-80% |
| **Cache agresivo** | Mejora velocidad de carga para usuarios recurrentes |
| **Security headers** | Protege contra ataques XSS, clickjacking, etc. |
| **SPA routing** | Permite navegación dentro de la app React |
| **Proxy para PDFs** | Accede a recursos externos sin CORS |
| **Health endpoint** | Permite monitoreo automático |

---

## Despliegue

### 1. Crear el archivo `.dockerignore`

```
node_modules
npm-debug.log
.git
.gitignore
.env.local
.env.*.local
dist
build
.vscode
.idea
*.swp
*.swo
.DS_Store
DOCKER_DEPLOYMENT.md
MANUAL_INSTALACION_PRODUCCION.md
```

### 2. Construir la Imagen

```bash
# Construcción simple
docker build -t mapoteca:latest .

# Con etiqueta de versión
docker build -t mapoteca:1.0.0 -t mapoteca:latest .

# Con información de build
docker build \
  --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
  --build-arg VCS_REF=$(git rev-parse --short HEAD) \
  -t mapoteca:latest .
```

### 3. Crear el Contenedor con Docker Compose

```bash
# Iniciar los servicios
docker-compose up -d

# Verificar estado
docker-compose ps

# Ver logs
docker-compose logs -f mapoteca
```

### 4. Despliegue en Producción

#### Opción A: Servidor Individual

```bash
# Crear directorio de trabajo
mkdir -p /opt/mapoteca
cd /opt/mapoteca

# Copiar archivos necesarios
cp Dockerfile docker-compose.yml nginx.conf .dockerignore package.json package-lock.json ./
cp -r src public ./

# Construir y ejecutar
docker-compose up -d

# Verificar
curl http://localhost
```

#### Opción B: Orquestación con Docker Swarm

```bash
# Inicializar Swarm
docker swarm init

# Crear stack
docker stack deploy -c docker-compose.yml mapoteca

# Listar servicios
docker stack services mapoteca

# Ver logs
docker service logs mapoteca_mapoteca
```

#### Opción C: Kubernetes (K8s)

Crear archivo `deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mapoteca
  labels:
    app: mapoteca
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mapoteca
  template:
    metadata:
      labels:
        app: mapoteca
    spec:
      containers:
      - name: mapoteca
        image: mapoteca:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /index.html
            port: 80
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /index.html
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: mapoteca-service
spec:
  selector:
    app: mapoteca
  type: LoadBalancer
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
```

Desplegar:

```bash
kubectl apply -f deployment.yaml
kubectl get pods
kubectl logs -f deployment/mapoteca
```

---

## Gestión de Volúmenes

### Estructura de Volúmenes

```yaml
volumes:
  # Archivos estáticos (PDFs, documentos)
  mapoteca-data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /mnt/storage/mapoteca-data

  # Logs de aplicación
  mapoteca-logs:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /var/log/mapoteca

  # Caché de Nginx
  nginx-cache:
    driver: local
```

### Agregar Volumen Existente

```bash
# Listar volúmenes
docker volume ls

# Inspeccionar volumen
docker volume inspect mapoteca-data

# Crear volumen manual
docker volume create --name mapoteca-data

# Copiar datos a volumen
docker run --rm -v mapoteca-data:/data -v /ruta/local:/host \
  alpine cp -r /host/* /data/
```

### Backup de Volúmenes

```bash
# Backup
docker run --rm -v mapoteca-data:/data \
  -v /backups:/backup \
  alpine tar czf /backup/mapoteca-data-$(date +%Y%m%d).tar.gz -C /data .

# Restaurar
docker run --rm -v mapoteca-data:/data \
  -v /backups:/backup \
  alpine tar xzf /backup/mapoteca-data-YYYYMMDD.tar.gz -C /data
```

---

## Consideraciones de Seguridad

### 1. Acceso a CORS para PDFs

Si los PDFs están en un servidor externo, considerar:

```nginx
# En nginx.conf, agregar header CORS
add_header 'Access-Control-Allow-Origin' '*' always;
add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS' always;
add_header 'Access-Control-Allow-Headers' 'Content-Type' always;

if ($request_method = 'OPTIONS') {
    return 204;
}
```

### 2. Variables de Entorno

Crear archivo `.env`:

```env
# No incluir en el repositorio
NODE_ENV=production
VITE_API_BASE=https://sigquindio.gov.co
PDF_BASE_URL=https://sigquindio.gov.co/ArchivosQuindioIII/
NGINX_WORKER_CONNECTIONS=1024
```

Referenciar en `docker-compose.yml`:

```yaml
env_file:
  - .env
```

### 3. HTTPS/SSL

Agregar certificados Let's Encrypt:

```yaml
volumes:
  - ./certs:/etc/nginx/certs:ro
  - ./conf.d:/etc/nginx/conf.d:ro
```

Configurar en `nginx.conf`:

```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /etc/nginx/certs/cert.pem;
    ssl_certificate_key /etc/nginx/certs/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
}

# Redirigir HTTP a HTTPS
server {
    listen 80;
    return 301 https://$server_name$request_uri;
}
```

### 4. Rate Limiting

```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

location / {
    limit_req zone=api_limit burst=20 nodelay;
    try_files $uri $uri/ /index.html;
}
```

---

## Monitoreo y Logs

### Acceder a Logs

```bash
# Logs en vivo
docker-compose logs -f mapoteca

# Últimas 100 líneas
docker-compose logs --tail 100 mapoteca

# Con timestamps
docker-compose logs --timestamps mapoteca

# Acceso directo al volumen
docker run --rm -v mapoteca-logs:/logs alpine cat /logs/access.log
```

### Monitoreo con Portainer (Opcional)

```bash
docker run -d -p 8000:8000 -p 9000:9000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce
```

Acceder a `http://localhost:9000`

### Métricas con Prometheus (Opcional)

```yaml
# En docker-compose.yml
prometheus:
  image: prom/prometheus:latest
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml
    - prometheus-data:/prometheus
  ports:
    - "9090:9090"
  networks:
    - mapoteca-network
```

---

## Solución de Problemas

### Problema: "404 en rutas de la SPA"

**Solución:** Verificar que `nginx.conf` incluya:

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

### Problema: "PDFs no se cargan (CORS)"

**Solución:**

1. Verificar que el proxy está configurado en `nginx.conf`
2. Confirmar que `vite.config.js` tiene el proxy para desarrollo
3. Usar `docker logs mapoteca` para ver errores

### Problema: "Contenedor se reinicia constantemente"

**Solución:**

```bash
# Revisar logs
docker-compose logs mapoteca

# Inspeccionar contenedor
docker inspect mapoteca

# Reducir recursos si es necesario
# En docker-compose.yml agregar:
# deploy:
#   resources:
#     limits:
#       cpus: '0.5'
#       memory: 256M
```

### Problema: "Memoria agotada"

**Solución:**

```bash
# Limpiar imágenes no usadas
docker image prune -a

# Limpiar volúmenes no usados
docker volume prune

# Limpiar contenedores detenidos
docker container prune
```

### Problema: "Permisos denegados al montar volúmenes"

**Solución:**

```bash
# Ajustar permisos en el host
sudo chown -R 1000:1000 /ruta/local

# O en docker-compose.yml
volumes:
  mapoteca-data:
    driver: local
    driver_opts:
      uid: '1000'
      gid: '1000'
```

---

## Comandos Útiles

```bash
# Construir imagen
docker build -t mapoteca:latest .

# Ejecutar contenedor de prueba
docker run -it -p 3000:80 mapoteca:latest

# Iniciar servicios en segundo plano
docker-compose up -d

# Detener servicios
docker-compose down

# Detener y eliminar volúmenes
docker-compose down -v

# Reiniciar contenedor
docker-compose restart mapoteca

# Acceder a shell del contenedor
docker exec -it mapoteca sh

# Ver recursos consumidos
docker stats mapoteca

# Limpiar todo (¡CUIDADO!)
docker system prune -a --volumes

# Ver historial de cambios de imagen
docker history mapoteca:latest

# Exportar imagen a archivo
docker save mapoteca:latest -o mapoteca.tar

# Importar imagen desde archivo
docker load -i mapoteca.tar
```

---

## Ejemplo Completo de Despliegue

```bash
# 1. Preparar ambiente
mkdir -p ~/mapoteca-deploy
cd ~/mapoteca-deploy

# 2. Clonar o copiar archivos
cp -r ~/proyectos/Mapoteca_sig-quindio-react-completo/* .

# 3. Construir
docker build -t mapoteca:1.0.0 .

# 4. Verificar imagen
docker images | grep mapoteca

# 5. Ejecutar con Compose
docker-compose up -d

# 6. Verificar estado
docker-compose ps

# 7. Probar salud
curl -i http://localhost/

# 8. Ver logs
docker-compose logs -f

# 9. Acceder a shell si es necesario
docker exec -it mapoteca-app sh

# 10. Actualizar (nueva versión)
git pull origin main
docker build -t mapoteca:1.1.0 .
docker-compose down
# Actualizar docker-compose.yml con nueva versión
docker-compose up -d
```

---

## Referencias

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)

---

**Última actualización:** 2026-06-19  
**Versión:** 1.0
