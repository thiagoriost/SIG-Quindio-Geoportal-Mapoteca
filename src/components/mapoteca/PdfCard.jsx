import { Download, Eye, FileText } from 'lucide-react'

/**
 * Tarjeta individual de documento PDF de la mapoteca.
 *
 * Muestra una sola accion segun disponibilidad de la API:
 * - **Con conexion a la API**: muestra el enlace "Descargar PDF" apuntando a la URL del servidor.
 * - **Sin conexion a la API**: muestra el boton "Ver detalles" para consultar metadatos locales.
 *
 * @param {Object} props
 * @param {import('../../services/mapotecaService').MapotecaPdf} props.pdf
 *   Documento PDF a representar.
 * @param {boolean} props.isApiConnected
 *   `true` cuando la carga de datos se realizo exitosamente desde la API de mapoteca.
 * @param {(pdf: import('../../services/mapotecaService').MapotecaPdf) => void} props.onPreview
 *   Funcion invocada al solicitar la vista de detalles del documento en modo offline.
 * @returns {JSX.Element}
 */
export default function PdfCard({ pdf, isApiConnected, onPreview }) {
  return (
    <article className="map-card">
      <div className={`map-thumbnail category-${pdf.categoryId}`}>
        <FileText size={42} />
        <span>PDF</span>
      </div>

      <div className="map-card-body">
        <span className="map-category-label">{pdf.categoryLabel}</span>
        <h3>{pdf.title}</h3>

        <div className="map-metadata">
          <span>Escala: {pdf.escala}</span>
          <span>Año: {pdf.year}</span>
          <span>{pdf.municipio}</span>
        </div>

        <div className="map-card-actions">
          {isApiConnected ? (
            /* Con API disponible: abre el PDF directamente desde el servidor */
            <a href={pdf.url} target="_blank" rel="noreferrer">
              <Download size={16} />
              Descargar PDF
            </a>
          ) : (
            /* Sin API: permite revisar los metadatos del documento en modo local */
            <button type="button" onClick={() => onPreview(pdf)}>
              <Eye size={16} />
              Ver detalles
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
