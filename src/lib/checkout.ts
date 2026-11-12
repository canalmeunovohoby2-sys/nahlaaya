import type {
  BuyerInfo,
  CheckoutItem,
  CheckoutPayload,
  PaymentMethod,
  ShippingAddress,
} from '../types/checkout'
import type { CartLine } from './cart'
import {
  brazilianStates,
  isValidCep,
  isValidCpf,
  isValidEmail,
  isValidPhone,
  onlyDigits,
} from './checkout-validation'

export {
  brazilianStates,
  formatCep,
  formatCpf,
  formatPhone,
  isValidCep,
  isValidCpf,
  isValidEmail,
  isValidPhone,
  onlyDigits,
} from './checkout-validation'

export interface CheckoutFormValues {
  fullName: string
  cpf: string
  email: string
  phone: string
  cep: string
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
}

export type CheckoutFormField = keyof CheckoutFormValues

export type CheckoutErrors = Partial<Record<CheckoutFormField, string>>

export const emptyCheckoutForm: CheckoutFormValues = {
  fullName: '',
  cpf: '',
  email: '',
  phone: '',
  cep: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
}

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  pix: 'Pix',
  debit: 'Débito',
  credit: 'Crédito em 3x',
}

export function validateCheckoutForm(
  values: CheckoutFormValues,
): CheckoutErrors {
  const errors: CheckoutErrors = {}

  if (values.fullName.trim().length < 3) {
    errors.fullName = 'Informe o nome completo.'
  }

  if (!isValidCpf(values.cpf)) {
    errors.cpf = 'Informe um CPF válido.'
  }

  if (!isValidEmail(values.email)) {
    errors.email = 'Informe um e-mail válido.'
  }

  if (!isValidPhone(values.phone)) {
    errors.phone = 'Informe um telefone válido com DDD.'
  }

  if (!isValidCep(values.cep)) {
    errors.cep = 'Informe um CEP válido com 8 dígitos.'
  }

  if (values.street.trim().length === 0) {
    errors.street = 'Informe a rua.'
  }

  if (values.number.trim().length === 0) {
    errors.number = 'Informe o número.'
  }

  if (values.neighborhood.trim().length === 0) {
    errors.neighborhood = 'Informe o bairro.'
  }

  if (values.city.trim().length === 0) {
    errors.city = 'Informe a cidade.'
  }

  if (!brazilianStates.includes(values.state.trim().toUpperCase())) {
    errors.state = 'Informe a UF com 2 letras.'
  }

  return errors
}

export function buildCheckoutPayload(
  values: CheckoutFormValues,
  paymentMethod: PaymentMethod,
  lines: CartLine[],
  shippingServiceId?: string,
): CheckoutPayload {
  const buyer: BuyerInfo = {
    fullName: values.fullName.trim(),
    cpf: onlyDigits(values.cpf),
    email: values.email.trim().toLowerCase(),
    phone: onlyDigits(values.phone),
  }

  const address: ShippingAddress = {
    cep: onlyDigits(values.cep),
    street: values.street.trim(),
    number: values.number.trim(),
    complement: values.complement.trim(),
    neighborhood: values.neighborhood.trim(),
    city: values.city.trim(),
    state: values.state.trim().toUpperCase(),
  }

  const items: CheckoutItem[] = lines.map((line) => ({
    productId: line.productId,
    quantity: line.quantity,
  }))

  return {
    buyer,
    address,
    paymentMethod,
    items,
    ...(shippingServiceId ? { shippingServiceId } : {}),
  }
}
