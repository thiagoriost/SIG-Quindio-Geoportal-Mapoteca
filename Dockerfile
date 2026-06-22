FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_MAPOTECA_PUBLIC_ORIGIN
ARG VITE_MAPOTECA_API_BASE
ARG VITE_ADMIN_URL
ARG VITE_VISOR_URL

ENV VITE_MAPOTECA_PUBLIC_ORIGIN=${VITE_MAPOTECA_PUBLIC_ORIGIN}
ENV VITE_MAPOTECA_API_BASE=${VITE_MAPOTECA_API_BASE}
ENV VITE_ADMIN_URL=${VITE_ADMIN_URL}
ENV VITE_VISOR_URL=${VITE_VISOR_URL}

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime

RUN apk add --no-cache curl

# SPA fallback + static cache policy for Vite assets
RUN cat > /etc/nginx/conf.d/default.conf <<'EOF'
server {
  listen 80;
  server_name _;

  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
    try_files $uri =404;
  }
}
EOF

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -fsS http://127.0.0.1/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
