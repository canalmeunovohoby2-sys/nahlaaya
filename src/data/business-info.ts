/**
 * Informações comerciais que ainda dependem de confirmação da cliente.
 *
 * Os campos ficam centralizados aqui para que a loja possa preenchê-los sem
 * espalhar dados fictícios ou marcadores visuais pelas páginas públicas.
 * Enquanto um valor for `null`, ele não deve ser exibido ao consumidor.
 */
export interface BusinessInfo {
  legalName: string | null
  cnpj: string | null
  commercialAddress: string | null
  supportEmail: string | null
  supportPhone: string | null
  supportHours: string | null
  privacyContactChannel: string | null
  returnsContactChannel: string | null
  defaultCarrier: string | null
  shippingQuoteProvider: string | null
  postingDeadline: string | null
  deliveryEstimate: string | null
}

export const businessInfo: BusinessInfo = {
  legalName: null,
  cnpj: null,
  commercialAddress: null,
  supportEmail: null,
  supportPhone: null,
  supportHours: null,
  privacyContactChannel: null,
  returnsContactChannel: null,
  defaultCarrier: null,
  shippingQuoteProvider: null,
  postingDeadline: null,
  deliveryEstimate: null,
}

export const pendingBusinessInfo = Object.entries(businessInfo)
  .filter(([, value]) => !value)
  .map(([key]) => key as keyof BusinessInfo)
