/**
 * URL de acceso al administrador.
 *
 * Recomendacion de despliegue en Docker/Nginx:
 * usar una ruta relativa (ej. /admin/login) para no fijar localhost ni una IP.
 * El navegador resuelve esta ruta sobre el host actual (IP o dominio de despliegue).
 *
 * Fuente: VITE_ADMIN_URL
 */
export const ADMIN_URL = import.meta.env.VITE_ADMIN_URL ?? '/admin/login'

/**
 * URL del visor geográfico.
 *
 * Recomendacion de despliegue en Docker/Nginx:
 * usar ruta relativa (ej. /visor/) para mantener compatibilidad al cambiar IP/dominio.
 *
 * Fuente: VITE_VISOR_URL
 */
export const VISOR_URL = import.meta.env.VITE_VISOR_URL ?? '/visor/'
