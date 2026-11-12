import { Link } from 'react-router-dom'
import { siteConfig } from '../../config/site'
import { navigation } from '../../data/categories'
import { legalLinks } from '../../data/legal'

const mainLinks = navigation.filter((item) =>
  ['/', '/perfumes'].includes(item.to),
)

const collectionLinks = navigation.filter((item) =>
  ['/femininos', '/masculinos', '/ofertas'].includes(item.to),
)

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer__top">
          <div className="footer__brand">
            <Link to="/" className="footer__logo" aria-label="Nahla Aya — página inicial">
              <img
                src="/logosite.png"
                alt="Nahla Aya"
                className="footer__logo-image"
                width={668}
                height={546}
                loading="lazy"
                decoding="async"
              />
            </Link>
            <p className="footer__tagline">{siteConfig.tagline}</p>
            <p className="footer__description">
              Uma curadoria de perfumes para acompanhar a sua história.
            </p>
          </div>

          <div className="footer__column">
            <h2 className="footer__heading">Navegue</h2>
            <ul>
              {mainLinks.map((item) => (
                <li key={item.to}>
                  <Link to={item.to}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer__column">
            <h2 className="footer__heading">Coleções</h2>
            <ul>
              {collectionLinks.map((item) => (
                <li key={item.to}>
                  <Link to={item.to}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer__column">
            <h2 className="footer__heading">Sua compra</h2>
            <ul>
              <li>
                <Link to="/carrinho">Sacola</Link>
              </li>
              <li>
                <Link to="/perfumes">Catálogo completo</Link>
              </li>
            </ul>
            <p className="footer__payment">
              Pix · Débito
              <br />
              Cartão em até 3x
            </p>
          </div>
        </div>

        <nav className="footer__legal" aria-label="Políticas e informações da loja">
          <span className="footer__legal-label">Políticas</span>
          <ul>
            {legalLinks.map((link) => (
              <li key={link.to}>
                <Link to={link.to}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="footer__bottom">
          <p>© {siteConfig.year} Nahla Aya. Todos os direitos reservados.</p>
          <div className="footer__bottom-meta">
            <Link to="/admin/login" className="footer__admin-link">
              Área administrativa
            </Link>
            <p className="footer__signature">Perfumaria selecionada</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
