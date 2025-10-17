import { Routes, Route, useLocation } from 'react-router-dom'
import { LandingPage } from './pages/LandingPage'
import { Navigation } from './components/Navigation'
import { DocsPage } from './pages/DocsPage'

function App() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="transition-all duration-300 ease-in-out">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/docs" element={<DocsPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App