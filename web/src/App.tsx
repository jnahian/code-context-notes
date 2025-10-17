import { Routes, Route, useLocation } from 'react-router-dom'
import { Navigation } from './components/Navigation'
import { Footer } from './components/landing/Footer'
import { LandingPage } from './pages/LandingPage'
import { DocsPage } from './pages/DocsPage'

function App() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="transition-all duration-300 ease-in-out flex-1">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/docs" element={<DocsPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

export default App