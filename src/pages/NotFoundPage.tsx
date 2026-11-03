import { Link } from 'react-router-dom'
import { BottleLineArt } from '../components/art/BottleLineArt'
import { EmptyState } from '../components/ui/EmptyState'
import { usePageTitle } from '../hooks/usePageTitle'

export function NotFoundPage() {
  usePageTitle('Página não encontrada')

  return (
    <section className="section not-found">
      <div className="container">
        <p className="not-found__code" aria-hidden="true">
          404
        </p>
        <EmptyState
          icon={<BottleLineArt />}
          title="Página não encontrada"
          description="O endereço que você procura não existe ou foi movido. Continue sua visita por um dos caminhos abaixo."
          actions={
            <>
              <Link to="/" className="btn btn--primary">
                Voltar ao início
              </Link>
              <Link to="/perfumes" className="btn btn--outline">
                Ver perfumes
              </Link>
            </>
          }
        />
      </div>
    </section>
  )
}
