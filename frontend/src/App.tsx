import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ThemeProvider } from './lib/theme'
import Analyzer from './pages/Analyzer'
import ArticleDetail from './pages/ArticleDetail'
import Articles from './pages/Articles'
import Dashboard from './pages/Dashboard'
import Models from './pages/Models'
import Search from './pages/Search'
import Topics from './pages/Topics'
import Upload from './pages/Upload'

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="articles" element={<Articles />} />
            <Route path="articles/:id" element={<ArticleDetail />} />
            <Route path="analyze" element={<Analyzer />} />
            <Route path="search" element={<Search />} />
            <Route path="topics" element={<Topics />} />
            <Route path="models" element={<Models />} />
            <Route path="upload" element={<Upload />} />
            <Route path="*" element={<p className="text-ink-2">Page not found.</p>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
