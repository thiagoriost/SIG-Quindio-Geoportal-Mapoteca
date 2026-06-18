import { useState } from 'react'
import Header from './components/layout/Header.jsx'
import Footer from './components/layout/Footer.jsx'
import Home from './pages/Home.jsx'
import Mapoteca from './pages/Mapoteca.jsx'
import VisorPlaceholder from './pages/VisorPlaceholder.jsx'

export default function App() {
  const [page, setPage] = useState('home')

  const navigate = (nextPage) => {
    // console.log({nextPage})
    setPage(nextPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="app">
      <Header currentPage={page} onNavigate={navigate} />

      {page === 'home' && <Home onNavigate={navigate} />}
      {page === 'mapoteca' && <Mapoteca />}
      {page === 'visor' && <VisorPlaceholder />}

      <Footer />
    </div>
  )
}
