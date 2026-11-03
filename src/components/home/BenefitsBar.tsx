import type { ComponentType, SVGProps } from 'react'
import {
  CardIcon,
  ChatIcon,
  GiftIcon,
  SparkleIcon,
} from '../icons/Icons'

interface Benefit {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  title: string
  description: string
}

const benefits: Benefit[] = [
  {
    icon: SparkleIcon,
    title: 'Curadoria',
    description: 'Perfumes selecionados com atenção.',
  },
  {
    icon: CardIcon,
    title: 'Pagamento',
    description: 'Pix, débito ou em até 3x.',
  },
  {
    icon: GiftIcon,
    title: 'Embalagem',
    description: 'Cuidado em cada detalhe.',
  },
  {
    icon: ChatIcon,
    title: 'Atendimento',
    description: 'Orientação para escolher com calma.',
  },
]

export function BenefitsBar() {
  return (
    <section className="benefits-band" aria-label="Benefícios da loja">
      <div className="container">
        <p className="benefits-band__eyebrow">
          <span aria-hidden="true" />
          Perfumaria de assinatura
          <span aria-hidden="true" />
        </p>

        <div className="benefits-band__grid">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon

            return (
              <div key={benefit.title} className="benefit">
                <span className="benefit__index" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="benefit__icon" aria-hidden="true">
                  <Icon width={18} height={18} />
                </span>
                <div className="benefit__copy">
                  <h2>{benefit.title}</h2>
                  <p>{benefit.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
