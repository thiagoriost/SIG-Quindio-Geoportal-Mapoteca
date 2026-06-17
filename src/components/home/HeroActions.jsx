import { FolderDot, FileText, MapPinned } from 'lucide-react'
import { ADMIN_URL } from '../../utils/urls'

export default function HeroActions({ onNavigate }) {
  return (
    <div className="hero-action-cards">
      <button className="hero-action active" onClick={() => onNavigate('visor')}>
        <MapPinned size={24} />
        <span>
          <strong>Visor Geográfico</strong>
          <small>Explorar visor</small>
        </span>
      </button>
      

      <button className="hero-action" onClick={() => onNavigate('mapoteca')}>
        <FileText size={24} />
        <span>
          <strong>Mapoteca</strong>
          <small>Catálogo de mapas</small>
        </span>
      </button>

      <button className="hero-action" onClick={() => window.open(ADMIN_URL, '_blank', 'noopener,noreferrer')}>
        <FolderDot size={24} />
        <span>
          <strong>Administrador</strong>
          <small>Administración</small>
        </span>
      </button>
    </div>
  )
}
