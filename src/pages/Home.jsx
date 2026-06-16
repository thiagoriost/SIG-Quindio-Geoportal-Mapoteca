import { BarChart3, CloudDownload, FileText, Globe2, MapPinned } from 'lucide-react'
import HeroActions from '../components/home/HeroActions.jsx'
import ToolCard from '../components/home/ToolCard.jsx'
import escudoQuindio from '../assets/images/escudoQuindio.jpg'
import logoCRQ from '../assets/images/logoCRQ2.jpg'
import logoIgac from '../assets/images/IGAC_LOGO.png'
import { ADMIN_URL } from '../utils/urls.js'

export default function Home({ onNavigate }) {
  return (
    <main>
      <section className="home-hero">
        <div className="hero-bg-decoration coffee"></div>
        <div className="hero-bg-decoration leaves"></div>

        <div className="home-hero-content">
          {/* <p className="section-kicker">Geoportal departamental</p> */}
          <h1>Sistema de Información Geográfica del Quindío</h1>
          <p>
            Información territorial para la planificación, gestión y desarrollo
            sostenible del departamento.
          </p>

          <HeroActions onNavigate={onNavigate} />
        </div>

        {/* <div className="slider-dots">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div> */}
      </section>

      <section className="content-section">
        <div className="section-heading">
          <h2>Explora nuestras herramientas</h2>
          <p>
            Accede al visor geográfico, consulta la mapoteca, revisa el administrador de servicios.
          </p>
        </div>

        <div className="tools-grid">
          <ToolCard
            icon={<Globe2 />}
            title="Visor Geográfico"
            text="Consulta y analiza información geográfica interactiva."
            action="Abrir visor"
            onClick={() => onNavigate('visor')}
          />
          <ToolCard
            icon={<FileText />}
            title="Mapoteca"
            text="Consulta mapas temáticos, documentos y publicaciones."
            action="Explorar"
            onClick={() => onNavigate('mapoteca')}
          />
          <ToolCard
            icon={<BarChart3 />}
            title="Módulo de Administración"
            text="Visualiza  módulo de administración del sistema."
            action="Ver administrador"
            onClick={() => {
              console.log({ADMIN_URL})
              window.open(ADMIN_URL, '_blank', 'noopener,noreferrer')
            }}
          />
          {/* <ToolCard
            icon={<CloudDownload />}
            title="Descargas"
            text="Descarga información geográfica y documentos."
            action="Ir a descargas"
            onClick={() => document.getElementById('descargas')?.scrollIntoView()}
          /> */}
        </div>
      </section>

      <section className="home-stats" id="indicadores">
        <div>
          <MapPinned />
          <strong>12</strong>
          <span>Municipios</span>
        </div>
        <div>
          <Globe2 />
          <strong>1.943 km²</strong>
          <span>Extensión territorial</span>
        </div>
        {/* <div>
          <BarChart3 />
          <strong>604.711</strong>
          <span>Habitantes aprox.</span>
        </div>
        <div>
          <FileText />
          <strong>+200</strong>
          <span>Capas de información</span>
        </div> */}
      </section>

      <section className="institutional-band">
        <div className="institution-logo">
          <img src={escudoQuindio} alt="Gobernacion del Quindio" />
        </div>
        <div className="institution-logo">
          <img src={logoIgac} alt="IGAC" />
        </div>
        <div className="institution-logo">
          <img src={logoCRQ} alt="CRQ" />
        </div>
      </section>
    </main>
  )
}
