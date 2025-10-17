import { Routes, Route } from 'react-router-dom'
import { LandingPage } from './pages/LandingPage'
import { Footer } from './components/landing'
import { Navigation } from './components/Navigation'
import { DocsPage } from './pages/DocsPage'

function App() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/docs" element={<DocsPage />} />
      </Routes>
      <Footer />
    </div>
  )
}

export default App