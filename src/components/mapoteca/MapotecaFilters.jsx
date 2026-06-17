import { Search, SlidersHorizontal } from 'lucide-react'

/**
 * Panel de filtros para el catalogo de mapoteca.
 *
 * @param {{
 *   query: string,
 *   setQuery: (value: string) => void,
 *   filters: { category: string, municipio: string, escala: string, year: string, format: string },
 *   setFilters: (updater: (current: any) => any) => void,
 *   categories: Array<{ id: string, label: string }>,
 *   municipios: string[],
 *   years: string[],
 *   scales: string[],
 *   onClear: () => void,
 * }} props Propiedades del componente.
 * @returns {JSX.Element} Controles de busqueda y filtros.
 */
export default function MapotecaFilters({
  query,
  setQuery,
  filters,
  setFilters,
  categories,
  municipios,
  years,
  scales,
  onClear,
}) {
  /**
   * Actualiza un campo puntual de los filtros.
   *
   * @param {string} field Nombre del campo.
   * @param {string} value Valor seleccionado.
   * @returns {void}
   */
  const update = (field, value) => {
    setFilters((current) => ({
      ...current,
      [field]: value,
    }))
  }

  return (
    <div className="mapoteca-filters">
      <div className="search-row">
        <div className="search-input">
          <Search size={19} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar mapas, temas, palabras clave..."
          />
        </div>

        <button className="advanced-search">
          <SlidersHorizontal size={18} />
          Búsqueda avanzada
        </button>
      </div>

      <div className="filter-row">
        <label>
          <span>Categoría</span>
          <select value={filters.category} onChange={(event) => update('category', event.target.value)}>
            <option value="all">Todas</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.label}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Municipio</span>
          <select value={filters.municipio} onChange={(event) => update('municipio', event.target.value)}>
            <option value="all">Todos</option>
            {municipios.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Escala</span>
          <select value={filters.escala} onChange={(event) => update('escala', event.target.value)}>
            <option value="all">Todas</option>
            {scales.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Año</span>
          <select value={filters.year} onChange={(event) => update('year', event.target.value)}>
            <option value="all">Todos</option>
            {years.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Formato</span>
          <select value={filters.format} onChange={(event) => update('format', event.target.value)}>
            <option value="all">Todos</option>
            <option value="PDF">PDF</option>
          </select>
        </label>

        <button className="clear-filters" onClick={onClear}>
          Limpiar filtros
        </button>
      </div>
    </div>
  )
}
