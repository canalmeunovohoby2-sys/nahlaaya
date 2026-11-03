import type { ProductCategory } from '../types/product'

export interface NavItem {
  label: string
  to: string
  end?: boolean
  index: string
}

export interface CategoryInfo {
  id: ProductCategory
  label: string
  singular: string
  path: string
}

export const navigation: NavItem[] = [
  { label: 'Início', to: '/', end: true, index: '01' },
  { label: 'Todos os perfumes', to: '/perfumes', index: '02' },
  { label: 'Femininos', to: '/femininos', index: '03' },
  { label: 'Masculinos', to: '/masculinos', index: '04' },
  { label: 'Ofertas', to: '/ofertas', index: '05' },
]

export const categories: CategoryInfo[] = [
  {
    id: 'feminino',
    label: 'Femininos',
    singular: 'Feminino',
    path: '/femininos',
  },
  {
    id: 'masculino',
    label: 'Masculinos',
    singular: 'Masculino',
    path: '/masculinos',
  },
  {
    id: 'unissex',
    label: 'Unissex',
    singular: 'Unissex',
    path: '/perfumes',
  },
]

export const categoryLabels: Record<ProductCategory, string> = {
  feminino: 'Feminino',
  masculino: 'Masculino',
  unissex: 'Unissex',
}
