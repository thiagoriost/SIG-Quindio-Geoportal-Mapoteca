import { categories, getCategoryUrl } from '../data/categories.js'
import { fallbackPdfs } from '../data/fallbackPdfs.js'
import { validaLoggerLocalStorage } from '../utils/utilities.js'

const MAPOTECA_PUBLIC_ORIGIN = import.meta.env.VITE_MAPOTECA_PUBLIC_ORIGIN?.trim()
const MAPOTECA_API_BASE = import.meta.env.VITE_MAPOTECA_API_BASE?.trim()

/**
 * @typedef {Object} MapotecaPdf
 * @property {string} id
 * @property {string} title
 * @property {string} fileName
 * @property {string} categoryId
 * @property {string} categoryLabel
 * @property {string} municipio
 * @property {string} escala
 * @property {string} year
 * @property {string} format
 * @property {string} url
 */

/**
 * @typedef {Object} MapotecaLoadResult
 * @property {MapotecaPdf[]} pdfs
 * @property {{ category?: { id: string, label: string }, message: string }[]} errors
 * @property {boolean} usingFallback
 * @property {'api' | 'legacy-directories' | 'fallback-data'} source
 */

/**
 * Decodifica texto URI de forma segura.
 *
 * @param {string} value Texto codificado.
 * @returns {string} Texto decodificado o el original cuando falla.
 */
function safeDecode(value) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/**
 * Limpia href relativos de listados de directorios.
 *
 * @param {string} href Enlace crudo.
 * @returns {string} Enlace normalizado.
 */
function cleanHref(href) {
  return href
    .replace(/^\.\//, '')
    .replace(/^\//, '')
    .trim()
}

/**
 * Determina si un enlace es un archivo PDF.
 *
 * @param {string} href Enlace a validar.
 * @returns {boolean} `true` cuando termina en `.pdf`.
 */
function isPdf(href) {
  return href.toLowerCase().endsWith('.pdf')
}

/**
 * Deriva un titulo legible a partir de nombre de archivo.
 *
 * @param {string} fileName Nombre de archivo.
 * @returns {string} Titulo transformado.
 */
function titleFromFileName(fileName) {
  return safeDecode(fileName)
    .replace(/\.pdf$/i, '')
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Extrae el anio desde nombre de archivo.
 *
 * @param {string} fileName Nombre de archivo.
 * @returns {string} Anio detectado o `Sin año`.
 */
function inferYearFromFileName(fileName) {
  const match = fileName.match(/(20\d{2}|19\d{2})/)
  return match ? match[0] : 'Sin año'
}

/**
 * Entrega escala por defecto en datos sin metadatos.
 *
 * @returns {string} Escala por defecto.
 */
function inferScale() {
  return '1:25.000'
}

/**
 * Entrega municipio por defecto en datos sin metadatos.
 *
 * @returns {string} Municipio por defecto.
 */
function inferMunicipio() {
  return 'Departamento del Quindío'
}

/**
 * Construye URL publica absoluta de una carpeta.
 *
 * @param {string} folderPath Ruta relativa de carpeta.
 * @returns {string} URL absoluta.
 */
function buildPublicFolderUrl(folderPath) {
  return new URL(folderPath, MAPOTECA_PUBLIC_ORIGIN).href
}

/**
 * Construye URL absoluta de PDF a partir de nombre o path.
 *
 * @param {string} fileName Nombre, path o URL del archivo.
 * @param {string} publicFolderUrl URL de carpeta publica.
 * @returns {string} URL absoluta del PDF.
 */
function buildPdfUrl(fileName, publicFolderUrl) {
  if (/^https?:\/\//i.test(fileName)) {
    return fileName
  }

  if (/^\/?ArchivosQuindioIII\//i.test(fileName)) {
    const absolutePath = fileName.startsWith('/') ? fileName : `/${fileName}`
    return new URL(absolutePath, MAPOTECA_PUBLIC_ORIGIN).href
  }

  return new URL(fileName, publicFolderUrl).href
}

/**
 * Construye URL de descarga segun endpoint de API de forma segura.
 * Soporta rutas absolutas (http/https) o relativas (/api/v1...) en Docker.
 *
 * @param {string} documentId Identificador del documento.
 * @returns {string} URL absoluta del endpoint de descarga.
 */
function buildDocumentDownloadUrl(documentId) {
  const relativePath = `documentos/${encodeURIComponent(documentId)}/descargar`
  
  if (!MAPOTECA_API_BASE) {
    console.error("[mapotecaService] ERROR: MAPOTECA_API_BASE no está configurada.");
    return '#'
  }

  try {
    // Intentamos construirla asumiendo que MAPOTECA_API_BASE ya podría ser absoluta
    // Si MAPOTECA_API_BASE es relativa (ej: '/api/v1'), fallará y pasará al bloque catch
    return new URL(relativePath, `${MAPOTECA_API_BASE}/`).href
  } catch (err) {
    try {
      // Solución para Docker/Rutas relativas: Si falló, combinamos la ruta relativa de la API 
      // usando el origen del navegador actual (window.location.origin) como la base raíz absoluta.
      const baseAbsoluta = new URL(`${MAPOTECA_API_BASE}/`, window.location.origin).href
      const urlFinal = new URL(relativePath, baseAbsoluta).href
      
      if (validaLoggerLocalStorage('logger')) {
        console.log("[mapotecaService] buildDocumentDownloadUrl (Ruta Relativa Docker)", { documentId, urlFinal })
      }
      return urlFinal
    } catch (fallbackErr) {
      console.error("[mapotecaService] Fallo crítico construyendo la URL de descarga:", fallbackErr)
      return '#'
    }
  }
}

/**
 * Normaliza texto para comparaciones tolerantes a acentos y mayusculas.
 *
 * @param {string | null | undefined} value Texto de entrada.
 * @returns {string} Texto normalizado.
 */
function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Convierte etiqueta de tematica a un ID estable.
 *
 * @param {string} label Etiqueta de tematica.
 * @returns {string} ID slugificado.
 */
function categoryIdFromLabel(label) {
  return normalizeText(label)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Mapea una etiqueta de tematica API a categoria local.
 *
 * @param {string} label Etiqueta de tematica.
 * @returns {{ id: string, label: string }} Categoria utilizable en la UI.
 */
function mapCategoryFromApi(label) {
  const normalized = normalizeText(label)
  const localMatch = categories.find((category) => normalizeText(category.label) === normalized)
  if (validaLoggerLocalStorage('logger')) console.log("mapCategoryFromApi",{ label, normalized, localMatch })

  if (localMatch) {
    return {
      id: localMatch.id,
      label: localMatch.label,
    }
  }

  return {
    id: categoryIdFromLabel(label) || 'sin-categoria',
    label: String(label || 'Sin categoria'),
  }
}

/**
 * Verifica conectividad reportada por el navegador.
 *
 * @returns {boolean} `true` cuando hay conectividad.
 */
function hasInternetConnection() {
  if (typeof navigator === 'undefined') {
    return true
  }

  return navigator.onLine
}

/**
 * Extrae arreglo de documentos desde distintos formatos de respuesta.
 *
 * @param {unknown} payload Respuesta JSON de API.
 * @returns {any[]} Arreglo de documentos.
 */
function extractDocuments(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.content)) return payload.content
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload?.documentos)) return payload.documentos

  return []
}

/**
 * Extrae el nombre de tematica desde primitivas u objetos API.
 *
 * @param {unknown} item Elemento crudo de tematica.
 * @returns {string} Nombre legible o cadena vacia.
 */
function extractTematicaLabel(item) {
  if (typeof item === 'string' || typeof item === 'number') {
    return String(item).trim()
  }

  if (!item || typeof item !== 'object') {
    return ''
  }

  const label =
    item.tematica ??
    item.nombreTematica ??
    item.nombre ??
    item.descripcion ??
    item.label ??
    item.name ??
    item.titulo ??
    item.valor ??
    item.value

  return String(label || '').trim()
}

/**
 * Normaliza lista de tematicas a etiquetas de texto.
 *
 * @param {unknown[]} values Lista cruda de respuesta API.
 * @returns {string[]} Etiquetas utilizables para consultas posteriores.
 */
function normalizeTematicas(values) {
  return values.map((item) => extractTematicaLabel(item)).filter(Boolean)
}

/**
 * Consulta tematicas desde la API de mapoteca.
 *
 * @returns {Promise<string[]>} Etiquetas de tematicas.
 */
async function fetchApiTematicas() {
  const response = await fetch(`${MAPOTECA_API_BASE}/tematicas`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  if (validaLoggerLocalStorage('logger')) console.log("[mapoteca] fetchApiTematicas response", { status: response.status, ok: response.ok, url: response.url, urlFetch:`${MAPOTECA_API_BASE}/tematicas` })
  if (!response.ok) {
    throw new Error('No fue posible consultar las tematicas de la API')
  }

  const payload = await response.json()

  // Temporal: inspeccion rapida de la forma de respuesta del backend.
  if (validaLoggerLocalStorage('logger')) console.log('[mapoteca] /tematicas payload shape', {
    isArray: Array.isArray(payload),
    topLevelKeys: payload && typeof payload === 'object' ? Object.keys(payload) : [],
    sample:
      Array.isArray(payload)
        ? payload[0]
        : Array.isArray(payload?.data)
          ? payload.data[0]
          : Array.isArray(payload?.tematicas)
            ? payload.tematicas[0]
            : payload,
  })

  if (Array.isArray(payload)) {
    const tematicas = normalizeTematicas(payload)
    if (validaLoggerLocalStorage('logger')) console.log('[mapoteca] tematicas normalizadas 1111', tematicas)
    return tematicas
  }

  if (Array.isArray(payload?.data)) {
    const tematicas = normalizeTematicas(payload.data)
    if (validaLoggerLocalStorage('logger')) console.log('[mapoteca] tematicas normalizadas 2222', tematicas)
    return tematicas
  }

  if (Array.isArray(payload?.tematicas)) {
    const tematicas = normalizeTematicas(payload.tematicas)
    if (validaLoggerLocalStorage('logger')) console.log('[mapoteca] tematicas normalizadas 3333', tematicas)
    return tematicas
  }

  if (validaLoggerLocalStorage('logger')) console.log('[mapoteca] tematicas normalizadas 4444', [])

  return []
}

/**
 * Consulta documentos por tematica en la API.
 *
 * @param {string} tematica Nombre de la tematica.
 * @returns {Promise<any[]>} Documentos retornados por API.
 */
async function fetchApiDocumentosByTematica(tematica) {
  let endpoint;
  try {
    // Si MAPOTECA_API_BASE es relativa (ej. /api/v1), usamos el origen actual del navegador como raíz absoluta
    endpoint = new URL(`${MAPOTECA_API_BASE}/documentos`, window.location.origin);
  } catch (e) {
    endpoint = new URL(`${MAPOTECA_API_BASE}/documentos`);
  }
  endpoint.searchParams.set('tematica', tematica)
  endpoint.searchParams.set('page', '1')
  endpoint.searchParams.set('size', '100')
  endpoint.searchParams.set('sort', 'titulo')
  endpoint.searchParams.set('direction', 'asc')
  if (validaLoggerLocalStorage('logger')) console.log("[mapoteca] fetchApiDocumentosByTematica endpoint", { tematica, url: endpoint.href, urlFetch:`${MAPOTECA_API_BASE}/documentos?tematica=${encodeURIComponent(tematica)}&page=1&size=100&sort=titulo&direction=asc` })
  
  const response = await fetch(endpoint.href, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  if (validaLoggerLocalStorage('logger')) console.log("[mapoteca] fetchApiDocumentosByTematica response", { status: response.status, ok: response.ok, url: response.url, urlFetch:`${MAPOTECA_API_BASE}/documentos?tematica=${encodeURIComponent(tematica)}&page=1&size=100&sort=titulo&direction=asc` })

  if (!response.ok) {
    throw new Error(`No fue posible consultar documentos para la tematica ${tematica}`)
  }

  const payload = await response.json()
  const documentsExtract = extractDocuments(payload)
  if (validaLoggerLocalStorage('logger')) console.log("[mapoteca] fetchApiDocumentosByTematica payload", { payload, documentsExtract })
  return documentsExtract
}

/**
 * Transforma un documento API al contrato consumido por la UI.
 *
 * @param {any} apiDocument Documento crudo API.
 * @param {string} tematica Tematica que origina la consulta.
 * @returns {MapotecaPdf} Documento normalizado.
 */
export function mapApiDocumentToPdf(apiDocument, tematica) {
  const category = mapCategoryFromApi(
    apiDocument.tematica || apiDocument.categoria || apiDocument.tema || tematica,
  )

  const documentId = String(apiDocument.id || apiDocument.documentId || apiDocument.uuid || '')
  const fileName = String(apiDocument.nombreArchivo || apiDocument.fileName || apiDocument.nombre || '')
  const title = String(apiDocument.titulo || apiDocument.title || titleFromFileName(fileName) || 'Documento')
  const format = String(apiDocument.tipo || apiDocument.mimeType || 'application/pdf')
  const yearValue = String(apiDocument.anio || apiDocument.year || inferYearFromFileName(apiDocument.fechaCarga))

  const pdf = {
    id: documentId || `${category.id}-${fileName || title}`,
    title,
    fileName: fileName || `${title}.pdf`,
    categoryId: category.id,
    categoryLabel: category.label,
    municipio: String(apiDocument.municipio || inferMunicipio()),
    escala: String(apiDocument.escala || inferScale()),
    year: yearValue,
    format: format.toUpperCase().includes('PDF') ? 'PDF' : format,
    url:
      apiDocument.downloadUrl ||
      apiDocument.url ||
      apiDocument.enlace ||
      (documentId ? buildDocumentDownloadUrl(documentId) : '#')
  }
  // console.log({pdf})
  return pdf
}

/**
 * Carga documentos desde API en modo online.
 *
 * @returns {Promise<MapotecaLoadResult>} Resultado de carga por API.
 */
async function loadMapotecaPdfsFromApi() {

  const tematicas = await fetchApiTematicas()
  if (validaLoggerLocalStorage('logger')) console.log("loadMapotecaPdfsFromApi333",{ tematicas })
  if (tematicas.length === 0) {
    console.warn('La API no retornó temáticas válidas');
    return { pdfs: [], errors: [{ message: 'La API no retornó temáticas' }], usingFallback: true, source: 'fallback-data' }
  }
  const responses = await Promise.allSettled(
    tematicas.map(async (tematica) => {
      const documentos = await fetchApiDocumentosByTematica(tematica)
      return documentos.map((documento) => mapApiDocumentToPdf(documento, tematica))
    }),
  )

  // Extraemos únicamente los resultados de las promesas resueltas con éxito
  const pdfs = responses.flatMap((response) =>
    response.status === 'fulfilled' ? response.value : []
  )

  const errors = responses
    .map((response, index) => {
      if (response.status === 'fulfilled') return null

      const category = mapCategoryFromApi(tematicas[index])

      return {
        category,
        message: response.reason?.message || 'No fue posible consultar la tematica',
      }
    })
    .filter(Boolean)

  // Si se lograron rescatar PDFs a pesar de fallos en ciertas temáticas, evitamos activar el fallback total
  if (pdfs.length === 0) {
    throw new Error('La API no retornó ningún documento válido en las temáticas consultadas')
  }
    
  if (validaLoggerLocalStorage('logger')) console.log("loadMapotecaPdfsFromApi4444",{ tematicas, responses, pdfs, errors })
  return {
    pdfs,
    errors,
    usingFallback: false,
    source: 'api',
  }
}

/**
 * Carga PDFs leyendo el listado HTML de una carpeta publica.
 *
 * @param {{ id: string, label: string, folder: string }} category Categoria local.
 * @returns {Promise<MapotecaPdf[]>} PDFs de la categoria.
 */
export async function loadPdfsFromDirectory(category) {
  const folderUrl = getCategoryUrl(category)
  const publicFolderUrl = buildPublicFolderUrl(folderUrl)

  const response = await fetch(folderUrl, {
    method: 'GET',
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml',
    },
  })

  if (!response.ok) {
    throw new Error(`No fue posible consultar ${category.label}`)
  }

  const html = await response.text()
  const doc = new DOMParser().parseFromString(html, 'text/html')

  const pdfLinks = Array.from(doc.querySelectorAll('a'))
    .map((link) => link.getAttribute('href') || '')
    .map(cleanHref)
    .filter(isPdf)
  
  const mapPdfsLink = pdfLinks.map((fileName) => {
    const decodedFile = safeDecode(fileName)
    const pdf = {
      id: `${category.id}-${decodedFile}`,
      title: titleFromFileName(decodedFile),
      fileName: decodedFile,
      categoryId: category.id,
      categoryLabel: category.label,
      municipio: inferMunicipio(decodedFile),
      escala: inferScale(decodedFile),
      year: inferYearFromFileName(decodedFile),
      format: 'PDF',
      url: buildPdfUrl(fileName, publicFolderUrl),
    }
    return pdf
  })
  
  if (validaLoggerLocalStorage('logger')) console.log("loadPdfsFromDirectory",{ mapPdfsLink })
  return mapPdfsLink
}

/**
 * Carga documentos de mapoteca de forma resiliente.
 *
 * Reglas:
 * - Con internet: usa API (tematicas/documentos/descargar).
 * - Sin internet: usa la logica actual de lectura por carpetas.
 * - Si no se obtienen resultados: usa fallback local.
 *
 * @returns {Promise<MapotecaLoadResult>} Resultado de carga.
 */
export async function loadMapotecaPdfs() {
  const errors = []
  if (validaLoggerLocalStorage('logger')) console.log("loadMapotecaPdfs111",{ hasInternetConnection: hasInternetConnection() })
  // if (hasInternetConnection()) {
    try {
      const resultPdfsFromApi = await loadMapotecaPdfsFromApi()
      if (validaLoggerLocalStorage('logger')) console.log("loadMapotecaPdfsFromApi222",{ resultPdfsFromApi })
      return resultPdfsFromApi
    } catch (error) {
      errors.push({
        message: error?.message || 'No fue posible cargar datos desde la API',
      })
    }
  // }

  const responses = await Promise.allSettled(
    categories.map(async (category) => {
      const pdfs = await loadPdfsFromDirectory(category)
      return { category, pdfs }
    }),
  )

  const pdfs = responses.flatMap((response) =>
    response.status === 'fulfilled' ? response.value.pdfs : [],
  )
  if (validaLoggerLocalStorage('logger')) console.log("loadMapotecaPdfs",{ responses, pdfs })

  const directoryErrors = responses
    .map((response, index) => {
      if (response.status === 'fulfilled') return null

      return {
        category: categories[index],
        message: response.reason?.message || 'No fue posible consultar la carpeta',
      }
    })
    .filter(Boolean)

  errors.push(...directoryErrors)

  if (pdfs.length === 0) {
    return {
      pdfs: fallbackPdfs,
      errors,
      usingFallback: true,
      source: 'fallback-data',
    }
  }

  return {
    pdfs,
    errors,
    usingFallback: false,
    source: 'legacy-directories',
  }
}
