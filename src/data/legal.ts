export interface LegalLink {
  label: string
  shortLabel: string
  to: string
  description: string
}

export const legalLinks: LegalLink[] = [
  {
    label: 'Política de Privacidade',
    shortLabel: 'Privacidade',
    to: '/politica-de-privacidade',
    description: 'Como os dados do checkout são tratados e protegidos.',
  },
  {
    label: 'Trocas e Devoluções',
    shortLabel: 'Trocas e devoluções',
    to: '/trocas-e-devolucoes',
    description: 'Direito de arrependimento, defeitos e solicitações.',
  },
  {
    label: 'Política de Entrega',
    shortLabel: 'Entrega',
    to: '/politica-de-entrega',
    description: 'Cobertura, cotação de frete e rastreamento.',
  },
  {
    label: 'Termos e Condições',
    shortLabel: 'Termos',
    to: '/termos-e-condicoes',
    description: 'Regras de uso, pedidos, pagamentos e responsabilidades.',
  },
]

export interface LegalSection {
  id: string
  title: string
  paragraphs?: string[]
  bullets?: string[]
  note?: string
}

export interface LegalPageContent {
  eyebrow: string
  title: string
  description: string
  intro: string
  sections: LegalSection[]
}
