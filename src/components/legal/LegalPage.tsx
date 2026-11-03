import { Link, NavLink } from 'react-router-dom'
import { PageHeader } from '../ui/PageHeader'
import { businessInfo } from '../../data/business-info'
import { legalLinks } from '../../data/legal'
import type { LegalPageContent } from '../../data/legal'
import { usePageTitle } from '../../hooks/usePageTitle'

interface LegalPageProps {
  content: LegalPageContent
}

export function LegalPage({ content }: LegalPageProps) {
  usePageTitle(content.title)

  const contactDetails: { label: string; value: string; href: string }[] = []

  if (businessInfo.supportEmail) {
    contactDetails.push({
      label: 'E-mail',
      value: businessInfo.supportEmail,
      href: `mailto:${businessInfo.supportEmail}`,
    })
  }

  if (businessInfo.supportPhone) {
    contactDetails.push({
      label: 'Telefone',
      value: businessInfo.supportPhone,
      href: `tel:${businessInfo.supportPhone}`,
    })
  }

  return (
    <>
      <PageHeader
        eyebrow={content.eyebrow}
        title={content.title}
        description={content.description}
        crumbs={[
          { label: 'Início', to: '/' },
          { label: content.title },
        ]}
        meta={<span className="page-hero__count">Informações da loja</span>}
      />

      <section className="legal-section-wrap">
        <div className="container">
          <div className="legal-layout">
            <aside className="legal-aside">
              <nav className="legal-nav" aria-label="Páginas de políticas">
                <p className="legal-nav__eyebrow">Políticas</p>
                <ul>
                  {legalLinks.map((link) => (
                    <li key={link.to}>
                      <NavLink
                        to={link.to}
                        className={({ isActive }) =>
                          `legal-nav__link${isActive ? ' is-active' : ''}`
                        }
                      >
                        <span>{link.shortLabel}</span>
                        <span className="legal-nav__arrow" aria-hidden="true">
                          ↗
                        </span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </nav>

              <nav className="legal-toc" aria-label="Nesta página">
                <p className="legal-toc__eyebrow">Nesta página</p>
                <ol>
                  {content.sections.map((section, index) => (
                    <li key={section.id}>
                      <a href={`#${section.id}`}>
                        <span>{String(index + 1).padStart(2, '0')}</span>
                        {section.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </aside>

            <article className="legal-article">
              <p className="legal-article__intro">{content.intro}</p>

              {content.sections.map((section, index) => {
                const headingId = `${section.id}-title`

                return (
                  <section
                    key={section.id}
                    id={section.id}
                    className="legal-article__section"
                    aria-labelledby={headingId}
                  >
                    <div className="legal-article__heading">
                      <span className="legal-article__index" aria-hidden="true">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <h2 id={headingId}>{section.title}</h2>
                    </div>

                    {section.paragraphs?.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}

                    {section.bullets ? (
                      <ul className="legal-list">
                        {section.bullets.map((bullet) => (
                          <li key={bullet}>{bullet}</li>
                        ))}
                      </ul>
                    ) : null}

                    {section.note ? (
                      <aside className="legal-note">{section.note}</aside>
                    ) : null}
                  </section>
                )
              })}

              {contactDetails.length > 0 ? (
                <aside
                  className="legal-contact"
                  aria-labelledby="legal-contact-title"
                >
                  <p className="legal-contact__eyebrow">Atendimento</p>
                  <h2 id="legal-contact-title" className="legal-contact__title">
                    Fale com a Nahla Aya
                  </h2>
                  <ul>
                    {contactDetails.map((detail) => (
                      <li key={detail.label}>
                        <span>{detail.label}</span>
                        <a href={detail.href}>{detail.value}</a>
                      </li>
                    ))}
                  </ul>
                  {businessInfo.supportHours ? (
                    <p className="legal-contact__hours">
                      Horário de atendimento: {businessInfo.supportHours}
                    </p>
                  ) : null}
                </aside>
              ) : null}

              <div className="legal-article__actions">
                <Link to="/" className="btn btn--primary">
                  Voltar à loja
                </Link>
                <Link to="/perfumes" className="btn btn--outline">
                  Explorar perfumes
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>
    </>
  )
}
