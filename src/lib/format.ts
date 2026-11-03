import { siteConfig } from '../config/site'

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value)
}

export function getInstallmentAmount(total: number): number {
  return total / siteConfig.installmentCount
}

export function formatInstallment(total: number): string {
  return `${siteConfig.installmentCount}x de ${formatCurrency(
    getInstallmentAmount(total),
  )}`
}

export function formatVolume(volumeMl: number): string {
  return `${volumeMl} ml`
}
