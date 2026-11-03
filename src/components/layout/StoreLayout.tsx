import { Outlet, useLocation } from 'react-router-dom'
import { VisitTracker } from '../analytics/VisitTracker'
import { Footer } from './Footer'
import { Header } from './Header'
import { ScrollToTop } from './ScrollToTop'

export function StoreLayout() {
  const location = useLocation()
  const headerKey = `${location.pathname}${location.search}`

  return (
    <div className="site-shell">
      <ScrollToTop />
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <Header key={headerKey} />
      <main id="conteudo" className="site-main" tabIndex={-1}>
        <Outlet />
      </main>
      <VisitTracker />
      <Footer />
    </div>
  )
}
