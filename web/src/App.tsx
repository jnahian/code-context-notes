import { Routes, Route, useLocation } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { Navigation } from './components/Navigation'
import { Footer } from './components/landing/Footer'

// Lazy load pages
const LandingPage = lazy(() => import('./pages/LandingPage').then(module => ({ default: module.LandingPage })))
const DocsPage = lazy(() => import('./pages/DocsPage').then(module => ({ default: module.DocsPage })))

function App() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="transition-all duration-300 ease-in-out flex-1">
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-orange"></div>
          </div>
        }>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/docs" element={<DocsPage />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}

export default App