export const WHATSAPP_NUMBER = '5521990845544'
export const WHATSAPP_DISPLAY = '21 99084-5544'
export const WHATSAPP_HEADER_MESSAGE =
  'Olá! Conheci a Nahla Aya pela loja virtual e gostaria de obter mais informações.'

export function buildWhatsAppUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}

export function buildProductWhatsAppMessage(
  productName: string,
  productUrl: string,
): string {
  return `Olá! Estou interessado(a) no perfume ${productName} da Nahla Aya e gostaria de tirar algumas dúvidas. Poderiam me ajudar?\n\nLink do produto: ${productUrl}`
}

export function buildProductWhatsAppUrl(
  productName: string,
  productSlug: string,
  origin: string,
): string {
  const base = origin.replace(/\/+$/, '')
  const productUrl = `${base}/produto/${encodeURIComponent(productSlug)}`

  return buildWhatsAppUrl(
    buildProductWhatsAppMessage(productName, productUrl),
  )
}
