import { useState } from 'react'
import Header from './components/layout/Header.jsx'
import Footer from './components/layout/Footer.jsx'
import Home from './pages/Home.jsx'
import Mapoteca from './pages/Mapoteca.jsx'
import VisorPlaceholder from './pages/VisorPlaceholder.jsx'

// Se lee la URL externa del Visor desde las variables de entorno
const VISOR_URL = import.meta.env.VITE_VISOR_URL?.trim() || 'http://localhost:8055/visor/'

export default function App() {
  const [page, setPage] = useState('home')

  const navigate = (nextPage) => {
    
    if (nextPage === 'visor') {
      window.open(VISOR_URL, '_blank', 'noopener,noreferrer')
      return // Retornamos para no alterar la página actual del frontend
    }

    setPage(nextPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="app">
      <Header currentPage={page} onNavigate={navigate} />

      {page === 'home' && <Home onNavigate={navigate} />}
      {page === 'mapoteca' && <Mapoteca />}
      {/* {page === 'visor' && <VisorPlaceholder />} */}

      <Footer />
    </div>
  )
}
