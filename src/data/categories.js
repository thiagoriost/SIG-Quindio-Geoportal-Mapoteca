export const MAPOTECA_BASE_URL = '/ArchivosQuindioIII/SIG_QUINDIO/MAPOTECA/'

export const categories = [
  {
    id: 'agropecuario',
    label: 'Agropecuario',
    shortLabel: 'Agropecuario',
    folder: 'AGROPECUARIO/',
    icon: 'Sprout',
    color: 'green',
    description: 'Mapas de vocación, uso, cobertura y actividad agropecuaria.',
  },
  {
    id: 'ambiental',
    label: 'Ambiental',
    shortLabel: 'Ambiental',
    folder: 'AMBIENTAL/',
    icon: 'TreePine',
    color: 'emerald',
    description: 'Información ambiental, ecosistemas, áreas protegidas y recursos naturales.',
  },
  {
    id: 'cartografia-basica',
    label: 'Cartografía Básica',
    shortLabel: 'Cartografía',
    folder: 'CARTOGRAFIA_BASICA/',
    icon: 'Map',
    color: 'blue',
    description: 'Cartografía general, límites, planchas y mapas base.',
  },
  {
    id: 'gestion-riesgo',
    label: 'Gestión del Riesgo',
    shortLabel: 'Riesgos',
    folder: 'GESTION_DEL_RIESGO/',
    icon: 'TriangleAlert',
    color: 'orange',
    description: 'Amenazas, vulnerabilidad, riesgo y gestión preventiva.',
  },
  {
    id: 'ordenamiento-territorial',
    label: 'Ordenamiento Territorial',
    shortLabel: 'Ordenamiento',
    folder: 'ORDENAMIENTO_TERRITORIAL/',
    icon: 'Landmark',
    color: 'lime',
    description: 'Usos del suelo, normativa, instrumentos y planificación territorial.',
  },
  {
    id: 'socioeconomico',
    label: 'Socioeconómico',
    shortLabel: 'Socioeconómico',
    folder: 'SOCIOECONOMICO/',
    icon: 'BarChart3',
    color: 'yellow',
    description: 'Indicadores sociales, económicos y poblacionales.',
  },
]

export function getCategoryUrl(category) {
  return `${MAPOTECA_BASE_URL}${category.folder}`
}

export function getCategoryById(id) {
  return categories.find((category) => category.id === id)
}
