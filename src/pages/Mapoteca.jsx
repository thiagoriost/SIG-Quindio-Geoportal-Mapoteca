import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import MapotecaSidebar from '../components/mapoteca/MapotecaSidebar.jsx'
import MapotecaFilters from '../components/mapoteca/MapotecaFilters.jsx'
import PdfCard from '../components/mapoteca/PdfCard.jsx'
import PdfViewerModal from '../components/mapoteca/PdfViewerModal.jsx'
import { categories, getCategoryById } from '../data/categories.js'
import { fetchApiTematicas, mapCategoryFromApi, extractDocuments, mapApiDocumentToPdf } from '../services/mapotecaService.js'
import { validaLoggerLocalStorage } from '../utils/utilities.js'

const MAPOTECA_API_BASE = import.meta.env.VITE_MAPOTECA_API_BASE?.trim()

/**
 * Estado inicial de filtros de la mapoteca.
 */
const initialFilters = {
  category: 'all',
  municipio: 'all',
  escala: 'all',
  year: 'all',
  format: 'all',
}

/**
 * Obtiene valores unicos de un campo para construir opciones de filtro.
 */
function uniqueValues(items, field) {
  return [...new Set(items.map((item) => item[field]).filter(Boolean))]
    .filter((item) => item !== 'Sin año')
    .sort((a, b) => String(a).localeCompare(String(b)))
}

/**
 * Mapea categorias a partir de los documentos disponibles para soporte de tematicas API.
 */
function deriveCategoriesFromPdfs(pdfItems) {
  const categoryMap = new Map()

  pdfItems.forEach((pdf) => {
    if (!pdf.categoryId) return
    if (categoryMap.has(pdf.categoryId)) return

    const localCategory = getCategoryById(pdf.categoryId)

    categoryMap.set(pdf.categoryId, {
      id: pdf.categoryId,
      label: pdf.categoryLabel || localCategory?.label || 'Sin categoria',
      shortLabel: localCategory?.shortLabel || pdf.categoryLabel || 'Sin categoria',
      description:
        localCategory?.description ||
        `Documentos asociados a la temática ${pdf.categoryLabel || pdf.categoryId}.`,
      icon: localCategory?.icon || 'FileText',
    })
  })
  if (validaLoggerLocalStorage('logger')) console.log("deriveCategoriesFromPdfs", { categories: [...categoryMap.values()] })
  return [...categoryMap.values()].sort((a, b) => a.label.localeCompare(b.label))
}

export default function Mapoteca() {
  const [activeCategory, setActiveCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState(initialFilters)
  const [pdfs, setPdfs] = useState([])
  const [loading, setLoading] = useState(true)
  const [usingFallback, setUsingFallback] = useState(false)
  const [dataSource, setDataSource] = useState('legacy-directories')
  const [selectedPdf, setSelectedPdf] = useState(null)

  async function fetchApiDocumentosByTematica(tematica) {
    const endpoint = new URL(`${MAPOTECA_API_BASE}/documentos`)
    endpoint.searchParams.set('tematica', tematica)
    endpoint.searchParams.set('page', '1')
    endpoint.searchParams.set('size', '100')
    endpoint.searchParams.set('sort', 'titulo')
    endpoint.searchParams.set('direction', 'asc')
    
    if (validaLoggerLocalStorage('logger')) {
      console.log("[mapoteca] fetchApiDocumentosByTematica endpoint", { tematica, url: endpoint.href })
    }
    
    const response = await fetch(endpoint.href, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })
  
    if (!response.ok) {
      throw new Error(`No fue posible consultar documentos para la tematica ${tematica}`)
    }
  
    const payload = await response.json()
    const documents = extractDocuments(payload)
    return documents
  }

  const loadMapotecaPdfsFromApi = async () => {
    try {
      const tematicas = await fetchApiTematicas()
      if (validaLoggerLocalStorage('logger')) console.log("loadMapotecaPdfsFromApi - Temáticas", { tematicas })
      
      if (!tematicas || tematicas.length === 0) {
        console.error('La API no retornó temáticas')
        throw new Error('La API no retornó temáticas')
      }

      // Creamos un mapeo de promesas para ejecutar en paralelo
      const promesasPorTematica = tematicas.map(async (tematica) => {
        const documentos = await fetchApiDocumentosByTematica(tematica)
        return documentos.map((documento) => mapApiDocumentToPdf(documento, tematica))
      })

      // Resolvemos de forma segura todas las peticiones concurrentes
      const responses = await Promise.allSettled(promesasPorTematica)

      const pdfsProcesados = responses.flatMap((response) =>
        response.status === 'fulfilled' ? response.value : []
      )
    
      const errors = responses
        .map((response, index) => {
          if (response.status === 'fulfilled') return null
          const category = mapCategoryFromApi(tematicas[index])
          return {
            category,
            message: response.reason?.message || 'No fue posible consultar la temática',
          }
        })
        .filter(Boolean)
    
      /* if (pdfsProcesados.length === 0) {
        throw new Error('La API no retornó documentos válidos en ninguna temática')
      } */
        
      if (validaLoggerLocalStorage('logger')) {
        console.log("loadMapotecaPdfsFromApi - Resultados", { tematicas, pdfs: pdfsProcesados, errors })
      }

      return {
        pdfs: pdfsProcesados,
        errors,
        usingFallback: false,
        source: 'api',
      }
      
    } catch (error) {
      console.error('Error al cargar PDFs desde la API:', error)
      // Retornamos un objeto de falla controlado para que la app decida si aplicar fallback local
      return {
        pdfs: [],
        errors: [error.message],
        usingFallback: true,
        source: 'legacy-directories'
      }
    }
  }

  // Efecto único de inicialización de datos
  useEffect(() => {
    let isMounted = true

    async function initializeMapoteca() {
      setLoading(true)
      const result = await loadMapotecaPdfsFromApi()
      
      if (isMounted && result) {
        setPdfs(result.pdfs)
        setUsingFallback(result.usingFallback)
        setDataSource(result.source || 'legacy-directories')
        setLoading(false)
      }
    }

    initializeMapoteca()

    return () => {
      isMounted = false
    }
  }, [])

  const availableCategories = useMemo(() => {
    const dynamicCategories = deriveCategoriesFromPdfs(pdfs)
    return dynamicCategories.length > 0 ? dynamicCategories : categories
  }, [pdfs])

  const totals = useMemo(() => {
    const totalValues = { all: pdfs.length }
    availableCategories.forEach((category) => {
      totalValues[category.id] = pdfs.filter((pdf) => pdf.categoryId === category.id).length
    })
    return totalValues
  }, [pdfs, availableCategories])

  const municipios = useMemo(() => uniqueValues(pdfs, 'municipio'), [pdfs])
  const years = useMemo(() => uniqueValues(pdfs, 'year').reverse(), [pdfs])
  const scales = useMemo(() => uniqueValues(pdfs, 'escala'), [pdfs])

  const filteredPdfs = useMemo(() => {
    const search = query.trim().toLowerCase()

    return pdfs
      .filter((pdf) => activeCategory === 'all' || pdf.categoryId === activeCategory)
      .filter((pdf) => filters.category === 'all' || pdf.categoryId === filters.category)
      .filter((pdf) => filters.municipio === 'all' || pdf.municipio === filters.municipio)
      .filter((pdf) => filters.escala === 'all' || pdf.escala === filters.escala)
      .filter((pdf) => filters.year === 'all' || pdf.year === filters.year)
      .filter((pdf) => filters.format === 'all' || pdf.format === filters.format)
      .filter((pdf) => {
        if (!search) return true
        return (
          pdf.title?.toLowerCase().includes(search) ||
          pdf.fileName?.toLowerCase().includes(search) ||
          pdf.categoryLabel?.toLowerCase().includes(search) ||
          pdf.municipio?.toLowerCase().includes(search)
        )
      })
      .sort((a, b) => a.title.localeCompare(b.title))
  }, [pdfs, activeCategory, filters, query])

  const selectedCategory =
    activeCategory === 'all'
      ? { label: 'Todas las categorías', description: 'Consulta consolidada de la mapoteca.' }
      : availableCategories.find((category) => category.id === activeCategory) ||
        getCategoryById(activeCategory)

  const clearFilters = () => {
    setQuery('')
    setFilters(initialFilters)
    setActiveCategory('all')
  }

  const handleCategory = (categoryId) => {
    setActiveCategory(categoryId)
    setFilters((current) => ({
      ...current,
      category: categoryId,
    }))
  }

  return (
    <main>
      <section className="mapoteca-banner">
        <div className="mapoteca-banner-content">
          <p className="section-kicker">Catálogo cartográfico</p>
          <h1>Mapoteca</h1>
          <p>Catálogo de mapas, documentos y publicaciones del territorio quindiano.</p>
        </div>
        <div className="banner-plants"></div>
      </section>

      <section className="mapoteca-content">
        <MapotecaFilters
          query={query}
          setQuery={setQuery}
          filters={filters}
          setFilters={setFilters}
          categories={availableCategories}
          municipios={municipios}
          years={years}
          scales={scales}
          onClear={clearFilters}
        />

        {usingFallback && (
          <div className="cors-warning">
            <AlertTriangle size={20} />
            <div>
              <strong>Modo demo activado</strong>
              <p>
                No fue posible leer todas las carpetas desde el navegador local. Se muestran
                PDFs de ejemplo y los PDFs que enviaste de Industria y Comercio.
              </p>
            </div>
          </div>
        )}

        <div className="mapoteca-layout">
          <MapotecaSidebar
            categories={availableCategories}
            activeCategory={activeCategory}
            totals={totals}
            onSelect={handleCategory}
          />

          <section className="mapoteca-results">
            <div className="results-header">
              <div>
                <h2>{selectedCategory?.label}</h2>
                <p>{selectedCategory?.description}</p>
              </div>

              <div className="results-order">
                <span>Mostrando {filteredPdfs.length} de {pdfs.length} mapas</span>
                <select>
                  <option>Más recientes</option>
                  <option>Título A-Z</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="loading-box">
                <Loader2 className="spin" size={38} />
                <p>Consultando carpetas de PDFs...</p>
              </div>
            ) : filteredPdfs.length === 0 ? (
              <div className="empty-box">
                <h3>No se encontraron mapas</h3>
                <p>Prueba limpiando los filtros o usando otra palabra clave.</p>
              </div>
            ) : (
              <div className="map-grid">
                {filteredPdfs.map((pdf) => (
                  <PdfCard
                    key={pdf.id}
                    pdf={pdf}
                    isApiConnected={dataSource === 'api'}
                    onPreview={setSelectedPdf}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </section>

      <PdfViewerModal pdf={selectedPdf} onClose={() => setSelectedPdf(null)} />
    </main>
  )
}