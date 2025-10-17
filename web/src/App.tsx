import { Routes, Route } from 'react-router-dom'
import { Navigation } from './components/Navigation'
import { LandingPage } from './pages/LandingPage'
import { DocsPage } from './pages/DocsPage'

function App() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/docs" element={<DocsPage />} />
      </Routes>
    </div>
  )
}

export default App